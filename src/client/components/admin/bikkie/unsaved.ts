import { ATTRIBUTE_TO_ICON } from "@/client/components/inventory/icons";
import type { AnyBikkieSchema } from "@/shared/bikkie/core";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { BiscuitAttributeAssignment } from "@/shared/bikkie/tray";
import { resolveAssignment } from "@/shared/bikkie/tray";
import type { Id } from "@/shared/bikkie/util";
import type { BiomesId } from "@/shared/ids";
import { compactMap } from "@/shared/util/collections";
import { ok } from "assert";
import { keys } from "lodash";
import defaultBiscuitIcon from "/public/hud/icon-16-biscuit.png";

export type BiscuitState = {
  readonly name: string;
  readonly extendedFrom: BiomesId;
  readonly attributes: Readonly<Record<number, BiscuitAttributeAssignment>>;
};

export type NamedBiscuitEdits = Id<
  Partial<BiscuitState> & {
    readonly id: BiomesId;
  }
>;

export class UnsavedBiscuit {
  constructor(
    readonly id: BiomesId,
    readonly defaultIcon: string,
    readonly current?: BiscuitState,
    readonly updates?: Partial<BiscuitState>
  ) {
    ok(current || updates);
  }

  withEdits(updates?: Partial<BiscuitState>) {
    return new UnsavedBiscuit(this.id, this.defaultIcon, this.current, updates);
  }

  get name(): string {
    return (this.updates?.name ?? this.current?.name)!;
  }

  get iconUrl() {
    const attributes = this.attributes;
    for (const [attributeName, iconFromValue] of ATTRIBUTE_TO_ICON) {
      const attribute = attribs.byName.get(attributeName);
      if (!attribute) {
        continue;
      }
      const assignment = resolveAssignment(
        attributes,
        attributes[attribute.id]
      );
      if (assignment?.kind !== "constant" || !assignment.value) {
        continue;
      }
      const icon = iconFromValue(assignment.value, {});
      if (icon) {
        return icon;
      }
    }
    return this.defaultIcon || defaultBiscuitIcon.src;
  }

  get extendedFrom() {
    return this.updates?.extendedFrom ?? this.current?.extendedFrom;
  }

  get attributes() {
    return {
      ...this.current?.attributes,
      ...this.updates?.attributes,
    };
  }

  get prettyName(): string {
    const merged = this.attributes[attribs.displayName.id];
    if (merged && merged.kind === "constant") {
      if (merged.value) {
        return merged.value as string;
      }
    }
    return this.name ?? `???(${this.id})`;
  }

  hasChanges(): boolean {
    return (
      this.updates !== undefined &&
      (this.current === undefined ||
        this.updates.name !== undefined ||
        keys(this.updates.attributes).length > 0)
    );
  }

  bake(): Biscuit {
    const attributes = this.attributes;
    const biscuit = Object.fromEntries(
      compactMap(Object.entries(attributes), ([rawId, assignment]) => {
        const attribute = attribs.byId.get(parseInt(rawId));
        if (!attribute) {
          return;
        }
        const resolved = resolveAssignment(attributes, assignment);
        return [
          attribute.name,
          resolved?.kind === "constant" ? resolved.value : undefined,
        ];
      })
    );
    biscuit.id = this.id;
    biscuit.name = this.name;
    return biscuit as Biscuit;
  }

  conforms(schema?: AnyBikkieSchema): boolean {
    if (!schema) {
      return true;
    }
    const attributes = this.attributes;
    for (const attributeName of schema.attributes) {
      const attribute = attribs.byName.get(attributeName)!;
      if (!resolveAssignment(attributes, attributes[attribute.id])) {
        return false;
      }
    }
    return true;
  }
}
