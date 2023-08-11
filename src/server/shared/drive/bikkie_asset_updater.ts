import type { BiomesBakery } from "@/server/shared/bikkie/registry";
import type { Notifier } from "@/server/shared/distributed_notifier/api";
import { getLatestAssetsByPath } from "@/server/shared/drive/mirror";
import type { BDB } from "@/server/shared/storage";
import { BikkieRuntime, getBiscuits } from "@/shared/bikkie/active";
import type { AnyBikkieAttributeOfType } from "@/shared/bikkie/attributes";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type {
  AnyBinaryAttribute,
  zAnyBinaryAttribute,
} from "@/shared/bikkie/schema/binary";
import { isAnyBinaryAttribute } from "@/shared/bikkie/schema/binary";
import type { BiscuitDefinition } from "@/shared/bikkie/tray";
import { createTrayMetadata } from "@/shared/bikkie/tray";
import { pathFromOrigin } from "@/shared/drive/types";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";

export class BikkieAssetUpdater {
  private readonly binaryAttributes: AnyBikkieAttributeOfType<
    typeof zAnyBinaryAttribute
  >[] = [];
  private lastEpoch = 0;

  constructor(
    private readonly db: BDB,
    private readonly bakery: BiomesBakery,
    private readonly notifier: Notifier,
    private readonly runtime: BikkieRuntime = BikkieRuntime.get()
  ) {
    for (const attribute of attribs.all) {
      if (isAnyBinaryAttribute(attribute.type())) {
        this.binaryAttributes.push(
          attribute as AnyBikkieAttributeOfType<typeof zAnyBinaryAttribute>
        );
      }
    }
  }

  async update() {
    const epoch = this.runtime.epoch;
    if (epoch === this.lastEpoch) {
      return;
    }

    const latestByPath = await getLatestAssetsByPath(this.db);

    const definitions: BiscuitDefinition[] = [];
    for (const biscuit of getBiscuits()) {
      const def: BiscuitDefinition = { id: biscuit.id, attributes: {} };
      let dirty = false;
      for (const { id: attributeId, name } of this.binaryAttributes) {
        const value = biscuit[
          name as keyof typeof biscuit
        ] as AnyBinaryAttribute;
        if (!value || !value.origin) {
          continue;
        }
        const path = pathFromOrigin(value.origin);
        if (!path) {
          continue;
        }
        const latest = latestByPath.get(path);
        if (!latest || latest.mirrored.hash === value.hash) {
          continue;
        }
        def.attributes[attributeId] = {
          kind: "constant",
          value: latest.mirrored,
        };
        log.info("Updating biscuit to refer to new asset", {
          biscuit: biscuit.id,
          name: biscuit.name,
          origin: value.origin,
          old: value.hash,
          new: latest.mirrored.hash,
        });
        dirty = true;
      }
      if (dirty) {
        definitions.push(def);
      }
    }

    if (definitions.length !== 0) {
      log.info(
        `Updating ${definitions.length} Biscuits to refer to new assets`
      );
      const tray = await this.bakery.saveAsActive(
        { meta: createTrayMetadata(`Asset auto update`, INVALID_BIOMES_ID) },
        ...definitions
      );
      await this.notifier.notify(String(tray.id));
    }
    this.lastEpoch = epoch;
  }
}
