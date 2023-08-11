import type { Entity } from "@/shared/ecs/gen/entities";
import type { SimpleIndex } from "@/shared/ecs/simple_index";
import type { BiomesId } from "@/shared/ids";

export class CheckIndex implements SimpleIndex {
  private readonly contents = new Set<BiomesId>();

  constructor(private readonly check: (entity: Entity) => boolean) {}

  *scanAll() {
    yield* this.contents;
  }

  get size() {
    return this.contents.size;
  }

  update(entity: Entity) {
    if (this.check(entity)) {
      this.contents.add(entity.id);
    } else {
      this.contents.delete(entity.id);
    }
  }

  delete(id: BiomesId) {
    this.contents.delete(id);
  }

  clear() {
    this.contents.clear();
  }
}
