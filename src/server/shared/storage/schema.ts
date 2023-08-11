import { BiomesStorage } from "@/server/shared/storage/biomes";
import { ok } from "assert";
import type { ZodLiteral, ZodNever, ZodType, ZodTypeAny, ZodUnion } from "zod";
import { z } from "zod";

export type IdSchema<TZodId extends ZodType<string>> = {
  id: TZodId;
};

type SkipFirst<T> = T extends readonly [any, ...infer TRest] ? TRest : [];

export type IdsOf<T> = T extends readonly [IdSchema<any>, ...IdSchema<any>[]]
  ? [T[0]["id"], ...IdsOf<SkipFirst<T>>]
  : [];

export type ChooseKeyType<T> = T extends readonly [
  ZodType<string>,
  ZodType<string>,
  ...ZodType<string>[]
]
  ? ZodUnion<T>
  : T extends [ZodType<string>]
  ? T[0]
  : ZodNever;

export type KeyFor<T> = ChooseKeyType<IdsOf<T>>;

export type DocumentSchema<
  TZodId extends ZodType<string>,
  TZodValue extends ZodType,
  TCollections extends readonly [...AnyCollectionSchema[]]
> = IdSchema<TZodId> & {
  value: TZodValue;
  key: KeyFor<TCollections>;
  collections: TCollections;
};

export type FlexibleId = string | ZodTypeAny;

export type ZodIdForId<T extends FlexibleId> = T extends string
  ? ZodLiteral<T>
  : T;

function coerceId<TId extends FlexibleId>(id: TId): ZodIdForId<TId> {
  return (typeof id === "string" ? z.literal(id) : id) as ZodIdForId<TId>;
}

export function doc<
  TId extends FlexibleId,
  TZodValue extends ZodType,
  TCollections extends readonly [...AnyCollectionSchema[]]
>(id: TId, value: TZodValue, ...collections: TCollections) {
  return <DocumentSchema<ZodIdForId<TId>, TZodValue, TCollections>>{
    id: coerceId(id),
    value,
    key:
      collections.length > 1
        ? z.union(
            collections.map((d) => d.id) as [
              ZodTypeAny,
              ZodTypeAny,
              ...ZodTypeAny[]
            ]
          )
        : collections.length > 0
        ? collections[0].id
        : z.never(),
    collections,
  };
}

export type AnyDocumentSchema = DocumentSchema<any, any, any>;

export type CollectionSchema<
  TZodId extends ZodType<string>,
  TDocuments extends readonly [AnyDocumentSchema, ...AnyDocumentSchema[]]
> = IdSchema<TZodId> & {
  key: KeyFor<TDocuments>;
  documents: TDocuments;
};

export function collection<
  TId extends FlexibleId,
  TDocuments extends readonly [AnyDocumentSchema, ...AnyDocumentSchema[]]
>(id: TId, ...documents: TDocuments) {
  return <CollectionSchema<ZodIdForId<TId>, TDocuments>>{
    id: coerceId(id),
    key:
      documents.length > 1
        ? z.union(
            documents.map((d) => d.id) as [
              ZodTypeAny,
              ZodTypeAny,
              ...ZodTypeAny[]
            ]
          )
        : documents[0].id,
    documents,
  };
}

export type AnyCollectionSchema = CollectionSchema<any, any>;

type PickChildSchema<
  TSchema extends IdSchema<any>,
  TKey,
  T
> = T extends readonly [TSchema, ...TSchema[]]
  ? TKey extends z.infer<T[0]["id"]>
    ? T[0]
    : PickChildSchema<TSchema, TKey, SkipFirst<T>>
  : never;

export type ValueFor<T> = T extends DocumentSchema<any, infer TZodValue, any>
  ? z.infer<TZodValue>
  : never;

export type ValueForWithId<T> = T extends DocumentSchema<
  infer TZodId,
  infer TZodValue,
  any
>
  ? z.infer<TZodValue> & { id: z.infer<TZodId> }
  : never;

type ValuesOf<T> = T extends [
  first: AnyDocumentSchema,
  ...rest: AnyDocumentSchema[]
]
  ? ValueFor<T[0]> | ValuesOf<SkipFirst<T>>
  : never;

export type ValuesFor<T> = T extends CollectionSchema<any, infer TDocuments>
  ? ValuesOf<TDocuments>
  : never;

export type QueryDocumentSnapshotFor<T> = T extends readonly [
  AnyDocumentSchema,
  ...AnyDocumentSchema[]
]
  ? QueryDocumentSnapshot<T[0]> | QueryDocumentSnapshotFor<SkipFirst<T>>
  : never;

export class DocumentReference<TSchema extends AnyDocumentSchema> {
  constructor(
    public readonly schema: TSchema,
    public readonly id: z.infer<TSchema["id"]>,
    public readonly backing: BiomesStorage.DocumentReference
  ) {}

  collection<TKey extends z.infer<TSchema["key"]>>(
    key: TKey
  ): CollectionReference<
    PickChildSchema<AnyCollectionSchema, TKey, TSchema["collections"]>
  > {
    for (const collectionSchema of this.schema.collections) {
      const id = collectionSchema.id.safeParse(key);
      if (!id.success) {
        continue;
      }
      return new CollectionReference(
        collectionSchema,
        id.data,
        this.backing.collection(BiomesStorage.escape(id.data))
      );
    }
    throw new Error(`No collection supports key: ${key}`);
  }

  async get(): Promise<DocumentSnapshot<TSchema>> {
    return new DocumentSnapshot(this, await this.backing.get());
  }

  async create(data: z.infer<TSchema["value"]>) {
    return this.backing.create(data);
  }

  async update(data: Partial<z.infer<TSchema["value"]>>) {
    return this.backing.update(data);
  }

  async set(data: z.infer<TSchema["value"]>) {
    return this.backing.set(data);
  }

  async delete() {
    return this.backing.delete();
  }
}

export class Query<
  TSchema extends AnyCollectionSchema,
  TBacking extends BiomesStorage.Query = BiomesStorage.Query
> {
  constructor(
    public readonly schema: TSchema,
    protected readonly backing: TBacking
  ) {}

  where(
    field: keyof ValuesFor<TSchema> & string,
    op: BiomesStorage.WhereFilterOp,
    value: any
  ) {
    return new Query(this.schema, this.backing.where(field, op, value));
  }

  orderBy(field: string, directionStr?: BiomesStorage.OrderByDirection) {
    return new Query(this.schema, this.backing.orderBy(field, directionStr));
  }

  offset(limit: number) {
    return new Query(this.schema, this.backing.offset(limit));
  }

  limit(limit: number) {
    return new Query(this.schema, this.backing.limit(limit));
  }

  startAfter(doc: QueryDocumentSnapshotFor<TSchema["documents"]>) {
    return new Query(this.schema, this.backing.startAfter(doc.backing));
  }

  async get() {
    return new QuerySnapshot<TSchema>(this.schema, await this.backing.get());
  }
}

export class CollectionReference<
  TSchema extends AnyCollectionSchema
> extends Query<TSchema, BiomesStorage.CollectionReference> {
  constructor(
    public readonly schema: TSchema,
    public readonly id: z.infer<TSchema["id"]>,
    public readonly backing: BiomesStorage.CollectionReference
  ) {
    super(schema, backing);
  }

  query(): Query<TSchema, BiomesStorage.Query> {
    return new Query(this.schema, this.backing);
  }

  doc<TKey extends z.infer<TSchema["key"]>>(key: TKey) {
    for (const documentSchema of this.schema.documents) {
      const id = documentSchema.id.safeParse(key);
      if (!id.success) {
        continue;
      }
      type TChildSchema = PickChildSchema<
        AnyDocumentSchema,
        TKey,
        TSchema["documents"]
      >;
      return new DocumentReference(
        documentSchema as TChildSchema,
        id.data,
        this.backing.doc(BiomesStorage.escape(id.data))
      );
    }
    throw new Error(`No document supports key: ${key}`);
  }
}

export class DocumentSnapshot<TSchema extends AnyDocumentSchema> {
  private decoded?: ValueFor<TSchema>;

  constructor(
    public readonly ref: DocumentReference<TSchema>,
    private readonly backing: BiomesStorage.DocumentSnapshot
  ) {}

  get id(): z.infer<TSchema["id"]> {
    return this.ref.id;
  }

  get exists(): boolean {
    return this.backing.exists;
  }

  data(): ValueFor<TSchema> | undefined {
    if (this.decoded === undefined) {
      const value = this.backing.data();
      if (value !== undefined) {
        this.decoded = this.ref.schema.value.parse(value);
      }
    }
    return this.decoded;
  }

  dataWithId(): ValueForWithId<TSchema> | undefined {
    const data = this.data();
    if (data !== undefined) {
      return {
        ...data,
        id: this.id,
      };
    }
  }
}

export class QueryDocumentSnapshot<TSchema extends AnyDocumentSchema> {
  private decoded?: ValueFor<TSchema>;

  constructor(
    public readonly ref: DocumentReference<TSchema>,
    public readonly backing: BiomesStorage.DocumentSnapshot
  ) {}

  get id(): z.infer<TSchema["id"]> {
    return this.ref.id;
  }

  get exists(): boolean {
    return this.backing.exists;
  }

  data(): ValueFor<TSchema> {
    if (this.decoded === undefined) {
      const value = this.backing.data();
      ok(value !== undefined);
      try {
        this.decoded = this.ref.schema.value.parse(value);
      } catch (error: any) {
        throw new Error(
          `Failed to decode document '${this.id}': '${JSON.stringify(
            value
          )}' => ${error}`
        );
      }
    }
    return this.decoded as ValueFor<TSchema>;
  }

  dataWithId(): ValueForWithId<TSchema> {
    return {
      ...this.data(),
      id: this.id,
    };
  }
}

export class QuerySnapshot<TSchema extends AnyCollectionSchema> {
  public readonly docs: QueryDocumentSnapshotFor<TSchema["documents"]>[];
  public readonly empty: boolean;

  constructor(
    public readonly schema: TSchema,
    backing: BiomesStorage.QuerySnapshot
  ) {
    this.docs = backing.docs.map((doc) => {
      for (const childSchema of schema.documents) {
        const id = childSchema.id.safeParse(BiomesStorage.unescape(doc.id));
        if (!id.success) {
          continue;
        }
        return new QueryDocumentSnapshot(
          new DocumentReference(childSchema, id.data, doc.ref),
          doc
        ) as QueryDocumentSnapshotFor<TSchema>;
      }
      throw new Error(`No document schema found for: ${doc.id}`);
    });
    this.empty = backing.empty;
  }
}

export class Transaction {
  constructor(private readonly backing: BiomesStorage.Transaction) {}

  async get<TRef extends DocumentReference<any>>(ref: TRef) {
    return new DocumentSnapshot<TRef["schema"]>(
      ref,
      await this.backing.get(ref.backing)
    );
  }

  create<Schema extends AnyDocumentSchema>(
    ref: DocumentReference<Schema>,
    data: ValueFor<Schema>
  ) {
    this.backing.create(ref.backing, data);
  }

  set<Schema extends AnyDocumentSchema>(
    ref: DocumentReference<Schema>,
    data: ValueFor<Schema>
  ) {
    this.backing.set(ref.backing, data);
  }

  update<Schema extends AnyDocumentSchema>(
    ref: DocumentReference<Schema>,
    data: Partial<ValueFor<Schema>>
  ) {
    this.backing.update(ref.backing, data);
  }

  delete<TRef extends DocumentReference<any>>(ref: TRef) {
    this.backing.delete(ref.backing);
  }
}

export class Store<
  TZodKey extends ZodType,
  TCollections extends readonly [AnyCollectionSchema, ...AnyCollectionSchema[]]
> {
  constructor(
    public readonly backing: BiomesStorage.Store,
    public readonly schema: TCollections
  ) {}

  collection<TKey extends z.infer<TZodKey>>(
    key: TKey
  ): CollectionReference<
    PickChildSchema<AnyCollectionSchema, TKey, TCollections>
  > {
    for (const collectionSchema of this.schema) {
      const id = collectionSchema.id.safeParse(key);
      if (!id.success) {
        continue;
      }
      type TChildSchema = PickChildSchema<
        AnyCollectionSchema,
        TZodKey,
        TCollections
      >;
      return new CollectionReference(
        collectionSchema as TChildSchema,
        id.data,
        this.backing.collection(BiomesStorage.escape(id.data))
      );
    }
    throw new Error(`No collection found for key ${key}`);
  }

  async getAll<TRef extends DocumentReference<any>>(...documentRefs: TRef[]) {
    const snapshots = await this.backing.getAll(
      ...documentRefs.map((ref) => ref.backing)
    );
    return snapshots.map((snapshot, index) => {
      const ref = documentRefs[index];
      return new DocumentSnapshot<TRef["schema"]>(ref, snapshot);
    });
  }

  runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return this.backing.runTransaction((transaction) =>
      updateFunction(new Transaction(transaction))
    );
  }
}

export function schemaStore<
  TCollections extends readonly [AnyCollectionSchema, ...AnyCollectionSchema[]]
>(backing: BiomesStorage.Store, ...collections: TCollections) {
  return new Store<KeyFor<TCollections>, TCollections>(backing, collections);
}
