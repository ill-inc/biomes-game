import type { Optional } from "@/shared/util/type_helpers";

export interface Deletable {
  delete(): void;
}

export function using<T extends Optional<Deletable>, Ret>(
  resource: T,
  func: (resource: T) => Ret
) {
  try {
    return func(resource);
  } finally {
    resource?.delete();
  }
}

export async function usingAsync<T extends Optional<Deletable>, Ret>(
  resource: T,
  func: (resource: T) => Promise<Ret>
): Promise<Ret> {
  try {
    return await func(resource);
  } finally {
    resource?.delete();
  }
}

export function usingAll<T extends Optional<Deletable>[], Ret>(
  resources: [...T],
  func: (...resources: T) => Ret
) {
  try {
    return func(...resources);
  } finally {
    for (const resource of resources) {
      resource?.delete();
    }
  }
}

export async function usingAllAsync<T extends Optional<Deletable>[], Ret>(
  resources: [...T],
  func: (...resources: T) => Promise<Ret>
) {
  try {
    return await func(...resources);
  } finally {
    for (const resource of resources) {
      resource?.delete();
    }
  }
}

// Helper for maintaining a series of deletables and you wish to delete
// them all in the end.
export class DeletableScope {
  private readonly resources: Optional<Deletable>[] = [];

  new<T extends Optional<Deletable>>(resourceType: { new (): T }) {
    const ret = new resourceType();
    this.use(ret);
    return ret;
  }

  use<T extends Optional<Deletable>>(resource: T): T {
    this.resources.push(resource);
    return resource;
  }

  delete() {
    for (const resource of this.resources) {
      resource?.delete();
    }
    this.resources.length = 0;
  }
}
