// GENERATED: This file is generated from json_serde.ts.j2. Do not modify directly.
// Content Hash: fc42476112110b6097a0d1c04b0b9aca

import * as c from "@/shared/ecs/gen/components";
import * as e from "@/shared/ecs/gen/entities";
import * as ev from "@/shared/ecs/gen/events";
import * as t from "@/shared/ecs/gen/types";
import { BiomesId, isBiomesId, zBiomesId, parseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";

export class IcedSerde {
  static serialize(_: any) {
    return [];
  }

  static deserialize(data: any): c.Iced {
    const fields: Partial<c.Iced> = {};
    if (!Array.isArray(data)) {
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
        }
      }
    }
    return c.Iced.create(fields);
  }
}
export class RemoteConnectionSerde {
  static serialize(_: any) {
    return [];
  }

  static deserialize(data: any): c.RemoteConnection {
    const fields: Partial<c.RemoteConnection> = {};
    if (!Array.isArray(data)) {
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
        }
      }
    }
    return c.RemoteConnection.create(fields);
  }
}
export class PositionSerde {
  static serialize(component: c.ReadonlyPosition) {
    const data = [];
    if (component.v !== null) {
      data[1 - 1] = component.v;
    }
    return data;
  }

  static deserialize(data: any): c.Position {
    const fields: Partial<c.Position> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.v = t.deserializeVec3f(data[1]);
      } else if (data.v !== undefined) {
        fields.v = t.deserializeVec3f(data.v);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.v = t.deserializeVec3f(data[i]);
            break;
        }
      }
    }
    return c.Position.create(fields);
  }
}
export class OrientationSerde {
  static serialize(component: c.ReadonlyOrientation) {
    const data = [];
    if (component.v !== null) {
      data[1 - 1] = component.v;
    }
    return data;
  }

  static deserialize(data: any): c.Orientation {
    const fields: Partial<c.Orientation> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.v = t.deserializeVec2f(data[1]);
      } else if (data.v !== undefined) {
        fields.v = t.deserializeVec2f(data.v);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.v = t.deserializeVec2f(data[i]);
            break;
        }
      }
    }
    return c.Orientation.create(fields);
  }
}
export class RigidBodySerde {
  static serialize(component: c.ReadonlyRigidBody) {
    const data = [];
    if (component.velocity !== null) {
      data[3 - 1] = component.velocity;
    }
    return data;
  }

  static deserialize(data: any): c.RigidBody {
    const fields: Partial<c.RigidBody> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.velocity = t.deserializeVec3f(data[3]);
      } else if (data.velocity !== undefined) {
        fields.velocity = t.deserializeVec3f(data.velocity);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.velocity = t.deserializeVec3f(data[i]);
            break;
        }
      }
    }
    return c.RigidBody.create(fields);
  }
}
export class SizeSerde {
  static serialize(component: c.ReadonlySize) {
    const data = [];
    if (component.v !== null) {
      data[3 - 1] = component.v;
    }
    return data;
  }

  static deserialize(data: any): c.Size {
    const fields: Partial<c.Size> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.v = t.deserializeVec3f(data[3]);
      } else if (data.v !== undefined) {
        fields.v = t.deserializeVec3f(data.v);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.v = t.deserializeVec3f(data[i]);
            break;
        }
      }
    }
    return c.Size.create(fields);
  }
}
export class BoxSerde {
  static serialize(component: c.ReadonlyBox) {
    const data = [];
    if (component.v0 !== null) {
      data[1 - 1] = component.v0;
    }
    if (component.v1 !== null) {
      data[2 - 1] = component.v1;
    }
    return data;
  }

  static deserialize(data: any): c.Box {
    const fields: Partial<c.Box> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.v0 = t.deserializeVec3i(data[1]);
      } else if (data.v0 !== undefined) {
        fields.v0 = t.deserializeVec3i(data.v0);
      }
      if (data[2] !== undefined) {
        fields.v1 = t.deserializeVec3i(data[2]);
      } else if (data.v1 !== undefined) {
        fields.v1 = t.deserializeVec3i(data.v1);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.v0 = t.deserializeVec3i(data[i]);
            break;
          case 2:
            fields.v1 = t.deserializeVec3i(data[i]);
            break;
        }
      }
    }
    return c.Box.create(fields);
  }
}
export class ShardSeedSerde {
  static serialize(component: c.ReadonlyShardSeed) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardSeed {
    const fields: Partial<c.ShardSeed> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardSeed.create(fields);
  }
}
export class ShardDiffSerde {
  static serialize(component: c.ReadonlyShardDiff) {
    const data = [];
    if (component.buffer !== null) {
      data[4 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardDiff {
    const fields: Partial<c.ShardDiff> = {};
    if (!Array.isArray(data)) {
      if (data[4] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[4]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 4:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardDiff.create(fields);
  }
}
export class ShardShapesSerde {
  static serialize(component: c.ReadonlyShardShapes) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardShapes {
    const fields: Partial<c.ShardShapes> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardShapes.create(fields);
  }
}
export class ShardSkyOcclusionSerde {
  static serialize(component: c.ReadonlyShardSkyOcclusion) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardSkyOcclusion {
    const fields: Partial<c.ShardSkyOcclusion> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardSkyOcclusion.create(fields);
  }
}
export class ShardIrradianceSerde {
  static serialize(component: c.ReadonlyShardIrradiance) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardIrradiance {
    const fields: Partial<c.ShardIrradiance> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardIrradiance.create(fields);
  }
}
export class ShardWaterSerde {
  static serialize(component: c.ReadonlyShardWater) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardWater {
    const fields: Partial<c.ShardWater> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardWater.create(fields);
  }
}
export class ShardOccupancySerde {
  static serialize(component: c.ReadonlyShardOccupancy) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardOccupancy {
    const fields: Partial<c.ShardOccupancy> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardOccupancy.create(fields);
  }
}
export class ShardDyeSerde {
  static serialize(component: c.ReadonlyShardDye) {
    const data = [];
    if (component.buffer !== null) {
      data[1 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardDye {
    const fields: Partial<c.ShardDye> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[1]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardDye.create(fields);
  }
}
export class ShardMoistureSerde {
  static serialize(component: c.ReadonlyShardMoisture) {
    const data = [];
    if (component.buffer !== null) {
      data[1 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardMoisture {
    const fields: Partial<c.ShardMoisture> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[1]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardMoisture.create(fields);
  }
}
export class ShardGrowthSerde {
  static serialize(component: c.ReadonlyShardGrowth) {
    const data = [];
    if (component.buffer !== null) {
      data[1 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardGrowth {
    const fields: Partial<c.ShardGrowth> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[1]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardGrowth.create(fields);
  }
}
export class ShardPlacerSerde {
  static serialize(component: c.ReadonlyShardPlacer) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardPlacer {
    const fields: Partial<c.ShardPlacer> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardPlacer.create(fields);
  }
}
export class ShardMuckSerde {
  static serialize(component: c.ReadonlyShardMuck) {
    const data = [];
    if (component.buffer !== null) {
      data[1 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardMuck {
    const fields: Partial<c.ShardMuck> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[1]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardMuck.create(fields);
  }
}
export class LabelSerde {
  static serialize(component: c.ReadonlyLabel) {
    const data = [];
    if (component.text !== null) {
      data[1 - 1] = component.text;
    }
    return data;
  }

  static deserialize(data: any): c.Label {
    const fields: Partial<c.Label> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.text = t.deserializeString(data[1]);
      } else if (data.text !== undefined) {
        fields.text = t.deserializeString(data.text);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.text = t.deserializeString(data[i]);
            break;
        }
      }
    }
    return c.Label.create(fields);
  }
}
export class GrabBagSerde {
  static serialize(component: c.ReadonlyGrabBag) {
    const data = [];
    if (component.slots !== null) {
      data[1 - 1] = t.serializeItemBag(component.slots);
    }
    if (component.filter !== null) {
      data[3 - 1] = t.serializeGrabBagFilter(component.filter);
    }
    if (component.mined !== null) {
      data[4 - 1] = component.mined;
    }
    return data;
  }

  static deserialize(data: any): c.GrabBag {
    const fields: Partial<c.GrabBag> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.slots = t.deserializeItemBag(data[1]);
      } else if (data.slots !== undefined) {
        fields.slots = t.deserializeItemBag(data.slots);
      }
      if (data[3] !== undefined) {
        fields.filter = t.deserializeGrabBagFilter(data[3]);
      } else if (data.filter !== undefined) {
        fields.filter = t.deserializeGrabBagFilter(data.filter);
      }
      if (data[4] !== undefined) {
        fields.mined = t.deserializeBool(data[4]);
      } else if (data.mined !== undefined) {
        fields.mined = t.deserializeBool(data.mined);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.slots = t.deserializeItemBag(data[i]);
            break;
          case 3:
            fields.filter = t.deserializeGrabBagFilter(data[i]);
            break;
          case 4:
            fields.mined = t.deserializeBool(data[i]);
            break;
        }
      }
    }
    return c.GrabBag.create(fields);
  }
}
export class AcquisitionSerde {
  static serialize(component: c.ReadonlyAcquisition) {
    const data = [];
    if (component.acquired_by !== null) {
      data[1 - 1] = t.serializeBiomesId(component.acquired_by);
    }
    if (component.items !== null) {
      data[3 - 1] = t.serializeItemBag(component.items);
    }
    return data;
  }

  static deserialize(data: any): c.Acquisition {
    const fields: Partial<c.Acquisition> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.acquired_by = t.deserializeBiomesId(data[1]);
      } else if (data.acquired_by !== undefined) {
        fields.acquired_by = t.deserializeBiomesId(data.acquired_by);
      }
      if (data[3] !== undefined) {
        fields.items = t.deserializeItemBag(data[3]);
      } else if (data.items !== undefined) {
        fields.items = t.deserializeItemBag(data.items);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.acquired_by = t.deserializeBiomesId(data[i]);
            break;
          case 3:
            fields.items = t.deserializeItemBag(data[i]);
            break;
        }
      }
    }
    return c.Acquisition.create(fields);
  }
}
export class LooseItemSerde {
  static serialize(component: c.ReadonlyLooseItem) {
    const data = [];
    if (component.item !== null) {
      data[1 - 1] = t.serializeItem(component.item);
    }
    return data;
  }

  static deserialize(data: any): c.LooseItem {
    const fields: Partial<c.LooseItem> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.item = t.deserializeItem(data[1]);
      } else if (data.item !== undefined) {
        fields.item = t.deserializeItem(data.item);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.item = t.deserializeItem(data[i]);
            break;
        }
      }
    }
    return c.LooseItem.create(fields);
  }
}
export class InventorySerde {
  static serialize(component: c.ReadonlyInventory) {
    const data = [];
    if (component.items !== null) {
      data[6 - 1] = t.serializeItemContainer(component.items);
    }
    if (component.currencies !== null) {
      data[7 - 1] = t.serializeItemBag(component.currencies);
    }
    if (component.hotbar !== null) {
      data[8 - 1] = t.serializeItemContainer(component.hotbar);
    }
    if (component.selected !== null) {
      data[9 - 1] = t.serializeOwnedItemReference(component.selected);
    }
    if (component.overflow !== null) {
      data[10 - 1] = t.serializeItemBag(component.overflow);
    }
    return data;
  }

  static deserialize(data: any): c.Inventory {
    const fields: Partial<c.Inventory> = {};
    if (!Array.isArray(data)) {
      if (data[6] !== undefined) {
        fields.items = t.deserializeItemContainer(data[6]);
      } else if (data.items !== undefined) {
        fields.items = t.deserializeItemContainer(data.items);
      }
      if (data[7] !== undefined) {
        fields.currencies = t.deserializeItemBag(data[7]);
      } else if (data.currencies !== undefined) {
        fields.currencies = t.deserializeItemBag(data.currencies);
      }
      if (data[8] !== undefined) {
        fields.hotbar = t.deserializeItemContainer(data[8]);
      } else if (data.hotbar !== undefined) {
        fields.hotbar = t.deserializeItemContainer(data.hotbar);
      }
      if (data[9] !== undefined) {
        fields.selected = t.deserializeOwnedItemReference(data[9]);
      } else if (data.selected !== undefined) {
        fields.selected = t.deserializeOwnedItemReference(data.selected);
      }
      if (data[10] !== undefined) {
        fields.overflow = t.deserializeItemBag(data[10]);
      } else if (data.overflow !== undefined) {
        fields.overflow = t.deserializeItemBag(data.overflow);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 6:
            fields.items = t.deserializeItemContainer(data[i]);
            break;
          case 7:
            fields.currencies = t.deserializeItemBag(data[i]);
            break;
          case 8:
            fields.hotbar = t.deserializeItemContainer(data[i]);
            break;
          case 9:
            fields.selected = t.deserializeOwnedItemReference(data[i]);
            break;
          case 10:
            fields.overflow = t.deserializeItemBag(data[i]);
            break;
        }
      }
    }
    return c.Inventory.create(fields);
  }
}
export class ContainerInventorySerde {
  static serialize(component: c.ReadonlyContainerInventory) {
    const data = [];
    if (component.items !== null) {
      data[1 - 1] = t.serializeItemContainer(component.items);
    }
    return data;
  }

  static deserialize(data: any): c.ContainerInventory {
    const fields: Partial<c.ContainerInventory> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.items = t.deserializeItemContainer(data[1]);
      } else if (data.items !== undefined) {
        fields.items = t.deserializeItemContainer(data.items);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.items = t.deserializeItemContainer(data[i]);
            break;
        }
      }
    }
    return c.ContainerInventory.create(fields);
  }
}
export class PricedContainerInventorySerde {
  static serialize(component: c.ReadonlyPricedContainerInventory) {
    const data = [];
    if (component.items !== null) {
      data[1 - 1] = t.serializePricedItemContainer(component.items);
    }
    if (component.infinite_capacity !== null) {
      data[2 - 1] = component.infinite_capacity;
    }
    return data;
  }

  static deserialize(data: any): c.PricedContainerInventory {
    const fields: Partial<c.PricedContainerInventory> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.items = t.deserializePricedItemContainer(data[1]);
      } else if (data.items !== undefined) {
        fields.items = t.deserializePricedItemContainer(data.items);
      }
      if (data[2] !== undefined) {
        fields.infinite_capacity = t.deserializeBool(data[2]);
      } else if (data.infinite_capacity !== undefined) {
        fields.infinite_capacity = t.deserializeBool(data.infinite_capacity);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.items = t.deserializePricedItemContainer(data[i]);
            break;
          case 2:
            fields.infinite_capacity = t.deserializeBool(data[i]);
            break;
        }
      }
    }
    return c.PricedContainerInventory.create(fields);
  }
}
export class SelectedItemSerde {
  static serialize(component: c.ReadonlySelectedItem) {
    const data = [];
    if (component.item !== null) {
      data[1 - 1] = t.serializeItemSlot(component.item);
    }
    return data;
  }

  static deserialize(data: any): c.SelectedItem {
    const fields: Partial<c.SelectedItem> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.item = t.deserializeItemSlot(data[1]);
      } else if (data.item !== undefined) {
        fields.item = t.deserializeItemSlot(data.item);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.item = t.deserializeItemSlot(data[i]);
            break;
        }
      }
    }
    return c.SelectedItem.create(fields);
  }
}
export class WearingSerde {
  static serialize(component: c.ReadonlyWearing) {
    const data = [];
    if (component.items !== null) {
      data[2 - 1] = t.serializeItemAssignment(component.items);
    }
    return data;
  }

  static deserialize(data: any): c.Wearing {
    const fields: Partial<c.Wearing> = {};
    if (!Array.isArray(data)) {
      if (data[2] !== undefined) {
        fields.items = t.deserializeItemAssignment(data[2]);
      } else if (data.items !== undefined) {
        fields.items = t.deserializeItemAssignment(data.items);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 2:
            fields.items = t.deserializeItemAssignment(data[i]);
            break;
        }
      }
    }
    return c.Wearing.create(fields);
  }
}
export class EmoteSerde {
  static serialize(component: c.ReadonlyEmote) {
    const data = [];
    if (component.emote_type !== null) {
      data[1 - 1] = component.emote_type;
    }
    if (component.emote_start_time !== null) {
      data[2 - 1] = component.emote_start_time;
    }
    if (component.emote_expiry_time !== null) {
      data[3 - 1] = component.emote_expiry_time;
    }
    if (component.rich_emote_components !== null) {
      data[5 - 1] = t.serializeOptionalRichEmoteComponents(
        component.rich_emote_components
      );
    }
    if (component.emote_nonce !== null) {
      data[6 - 1] = component.emote_nonce;
    }
    return data;
  }

  static deserialize(data: any): c.Emote {
    const fields: Partial<c.Emote> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.emote_type = t.deserializeOptionalEmoteType(data[1]);
      } else if (data.emote_type !== undefined) {
        fields.emote_type = t.deserializeOptionalEmoteType(data.emote_type);
      }
      if (data[2] !== undefined) {
        fields.emote_start_time = t.deserializeF64(data[2]);
      } else if (data.emote_start_time !== undefined) {
        fields.emote_start_time = t.deserializeF64(data.emote_start_time);
      }
      if (data[3] !== undefined) {
        fields.emote_expiry_time = t.deserializeF64(data[3]);
      } else if (data.emote_expiry_time !== undefined) {
        fields.emote_expiry_time = t.deserializeF64(data.emote_expiry_time);
      }
      if (data[5] !== undefined) {
        fields.rich_emote_components = t.deserializeOptionalRichEmoteComponents(
          data[5]
        );
      } else if (data.rich_emote_components !== undefined) {
        fields.rich_emote_components = t.deserializeOptionalRichEmoteComponents(
          data.rich_emote_components
        );
      }
      if (data[6] !== undefined) {
        fields.emote_nonce = t.deserializeOptionalF64(data[6]);
      } else if (data.emote_nonce !== undefined) {
        fields.emote_nonce = t.deserializeOptionalF64(data.emote_nonce);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.emote_type = t.deserializeOptionalEmoteType(data[i]);
            break;
          case 2:
            fields.emote_start_time = t.deserializeF64(data[i]);
            break;
          case 3:
            fields.emote_expiry_time = t.deserializeF64(data[i]);
            break;
          case 5:
            fields.rich_emote_components =
              t.deserializeOptionalRichEmoteComponents(data[i]);
            break;
          case 6:
            fields.emote_nonce = t.deserializeOptionalF64(data[i]);
            break;
        }
      }
    }
    return c.Emote.create(fields);
  }
}
export class AppearanceComponentSerde {
  static serialize(component: c.ReadonlyAppearanceComponent) {
    const data = [];
    if (component.appearance !== null) {
      data[1 - 1] = t.serializeAppearance(component.appearance);
    }
    return data;
  }

  static deserialize(data: any): c.AppearanceComponent {
    const fields: Partial<c.AppearanceComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.appearance = t.deserializeAppearance(data[1]);
      } else if (data.appearance !== undefined) {
        fields.appearance = t.deserializeAppearance(data.appearance);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.appearance = t.deserializeAppearance(data[i]);
            break;
        }
      }
    }
    return c.AppearanceComponent.create(fields);
  }
}
export class GroupComponentSerde {
  static serialize(component: c.ReadonlyGroupComponent) {
    const data = [];
    if (component.tensor !== null) {
      data[6 - 1] = component.tensor;
    }
    return data;
  }

  static deserialize(data: any): c.GroupComponent {
    const fields: Partial<c.GroupComponent> = {};
    if (!Array.isArray(data)) {
      if (data[6] !== undefined) {
        fields.tensor = t.deserializeTensorBlob(data[6]);
      } else if (data.tensor !== undefined) {
        fields.tensor = t.deserializeTensorBlob(data.tensor);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 6:
            fields.tensor = t.deserializeTensorBlob(data[i]);
            break;
        }
      }
    }
    return c.GroupComponent.create(fields);
  }
}
export class ChallengesSerde {
  static serialize(component: c.ReadonlyChallenges) {
    const data = [];
    if (component.in_progress !== null) {
      data[7 - 1] = t.serializeBiomesIdSet(component.in_progress);
    }
    if (component.complete !== null) {
      data[8 - 1] = t.serializeBiomesIdSet(component.complete);
    }
    if (component.available !== null) {
      data[9 - 1] = t.serializeBiomesIdSet(component.available);
    }
    if (component.started_at !== null) {
      data[10 - 1] = t.serializeChallengeTime(component.started_at);
    }
    if (component.finished_at !== null) {
      data[11 - 1] = t.serializeChallengeTime(component.finished_at);
    }
    return data;
  }

  static deserialize(data: any): c.Challenges {
    const fields: Partial<c.Challenges> = {};
    if (!Array.isArray(data)) {
      if (data[7] !== undefined) {
        fields.in_progress = t.deserializeBiomesIdSet(data[7]);
      } else if (data.in_progress !== undefined) {
        fields.in_progress = t.deserializeBiomesIdSet(data.in_progress);
      }
      if (data[8] !== undefined) {
        fields.complete = t.deserializeBiomesIdSet(data[8]);
      } else if (data.complete !== undefined) {
        fields.complete = t.deserializeBiomesIdSet(data.complete);
      }
      if (data[9] !== undefined) {
        fields.available = t.deserializeBiomesIdSet(data[9]);
      } else if (data.available !== undefined) {
        fields.available = t.deserializeBiomesIdSet(data.available);
      }
      if (data[10] !== undefined) {
        fields.started_at = t.deserializeChallengeTime(data[10]);
      } else if (data.started_at !== undefined) {
        fields.started_at = t.deserializeChallengeTime(data.started_at);
      }
      if (data[11] !== undefined) {
        fields.finished_at = t.deserializeChallengeTime(data[11]);
      } else if (data.finished_at !== undefined) {
        fields.finished_at = t.deserializeChallengeTime(data.finished_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 7:
            fields.in_progress = t.deserializeBiomesIdSet(data[i]);
            break;
          case 8:
            fields.complete = t.deserializeBiomesIdSet(data[i]);
            break;
          case 9:
            fields.available = t.deserializeBiomesIdSet(data[i]);
            break;
          case 10:
            fields.started_at = t.deserializeChallengeTime(data[i]);
            break;
          case 11:
            fields.finished_at = t.deserializeChallengeTime(data[i]);
            break;
        }
      }
    }
    return c.Challenges.create(fields);
  }
}
export class RecipeBookSerde {
  static serialize(component: c.ReadonlyRecipeBook) {
    const data = [];
    if (component.recipes !== null) {
      data[4 - 1] = t.serializeItemSet(component.recipes);
    }
    return data;
  }

  static deserialize(data: any): c.RecipeBook {
    const fields: Partial<c.RecipeBook> = {};
    if (!Array.isArray(data)) {
      if (data[4] !== undefined) {
        fields.recipes = t.deserializeItemSet(data[4]);
      } else if (data.recipes !== undefined) {
        fields.recipes = t.deserializeItemSet(data.recipes);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 4:
            fields.recipes = t.deserializeItemSet(data[i]);
            break;
        }
      }
    }
    return c.RecipeBook.create(fields);
  }
}
export class ExpiresSerde {
  static serialize(component: c.ReadonlyExpires) {
    const data = [];
    if (component.trigger_at !== null) {
      data[1 - 1] = component.trigger_at;
    }
    return data;
  }

  static deserialize(data: any): c.Expires {
    const fields: Partial<c.Expires> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.trigger_at = t.deserializeF64(data[1]);
      } else if (data.trigger_at !== undefined) {
        fields.trigger_at = t.deserializeF64(data.trigger_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.trigger_at = t.deserializeF64(data[i]);
            break;
        }
      }
    }
    return c.Expires.create(fields);
  }
}
export class IcingSerde {
  static serialize(component: c.ReadonlyIcing) {
    const data = [];
    if (component.trigger_at !== null) {
      data[1 - 1] = component.trigger_at;
    }
    return data;
  }

  static deserialize(data: any): c.Icing {
    const fields: Partial<c.Icing> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.trigger_at = t.deserializeF64(data[1]);
      } else if (data.trigger_at !== undefined) {
        fields.trigger_at = t.deserializeF64(data.trigger_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.trigger_at = t.deserializeF64(data[i]);
            break;
        }
      }
    }
    return c.Icing.create(fields);
  }
}
export class WarpableSerde {
  static serialize(component: c.ReadonlyWarpable) {
    const data = [];
    if (component.trigger_at !== null) {
      data[2 - 1] = component.trigger_at;
    }
    if (component.warp_to !== null) {
      data[3 - 1] = component.warp_to;
    }
    if (component.orientation !== null) {
      data[4 - 1] = component.orientation;
    }
    if (component.owner !== null) {
      data[5 - 1] = t.serializeBiomesId(component.owner);
    }
    return data;
  }

  static deserialize(data: any): c.Warpable {
    const fields: Partial<c.Warpable> = {};
    if (!Array.isArray(data)) {
      if (data[2] !== undefined) {
        fields.trigger_at = t.deserializeF64(data[2]);
      } else if (data.trigger_at !== undefined) {
        fields.trigger_at = t.deserializeF64(data.trigger_at);
      }
      if (data[3] !== undefined) {
        fields.warp_to = t.deserializeVec3f(data[3]);
      } else if (data.warp_to !== undefined) {
        fields.warp_to = t.deserializeVec3f(data.warp_to);
      }
      if (data[4] !== undefined) {
        fields.orientation = t.deserializeVec2f(data[4]);
      } else if (data.orientation !== undefined) {
        fields.orientation = t.deserializeVec2f(data.orientation);
      }
      if (data[5] !== undefined) {
        fields.owner = t.deserializeBiomesId(data[5]);
      } else if (data.owner !== undefined) {
        fields.owner = t.deserializeBiomesId(data.owner);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 2:
            fields.trigger_at = t.deserializeF64(data[i]);
            break;
          case 3:
            fields.warp_to = t.deserializeVec3f(data[i]);
            break;
          case 4:
            fields.orientation = t.deserializeVec2f(data[i]);
            break;
          case 5:
            fields.owner = t.deserializeBiomesId(data[i]);
            break;
        }
      }
    }
    return c.Warpable.create(fields);
  }
}
export class PlayerStatusSerde {
  static serialize(component: c.ReadonlyPlayerStatus) {
    const data = [];
    if (component.init !== null) {
      data[1 - 1] = component.init;
    }
    if (component.nux_status !== null) {
      data[9 - 1] = t.serializeAllNUXStatus(component.nux_status);
    }
    return data;
  }

  static deserialize(data: any): c.PlayerStatus {
    const fields: Partial<c.PlayerStatus> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.init = t.deserializeBool(data[1]);
      } else if (data.init !== undefined) {
        fields.init = t.deserializeBool(data.init);
      }
      if (data[9] !== undefined) {
        fields.nux_status = t.deserializeAllNUXStatus(data[9]);
      } else if (data.nux_status !== undefined) {
        fields.nux_status = t.deserializeAllNUXStatus(data.nux_status);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.init = t.deserializeBool(data[i]);
            break;
          case 9:
            fields.nux_status = t.deserializeAllNUXStatus(data[i]);
            break;
        }
      }
    }
    return c.PlayerStatus.create(fields);
  }
}
export class PlayerBehaviorSerde {
  static serialize(component: c.ReadonlyPlayerBehavior) {
    const data = [];
    if (component.camera_mode !== null) {
      data[1 - 1] = component.camera_mode;
    }
    if (component.place_event_info !== null) {
      data[2 - 1] = component.place_event_info;
    }
    return data;
  }

  static deserialize(data: any): c.PlayerBehavior {
    const fields: Partial<c.PlayerBehavior> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.camera_mode = t.deserializeCameraMode(data[1]);
      } else if (data.camera_mode !== undefined) {
        fields.camera_mode = t.deserializeCameraMode(data.camera_mode);
      }
      if (data[2] !== undefined) {
        fields.place_event_info = t.deserializeOptionalPlaceEventInfo(data[2]);
      } else if (data.place_event_info !== undefined) {
        fields.place_event_info = t.deserializeOptionalPlaceEventInfo(
          data.place_event_info
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.camera_mode = t.deserializeCameraMode(data[i]);
            break;
          case 2:
            fields.place_event_info = t.deserializeOptionalPlaceEventInfo(
              data[i]
            );
            break;
        }
      }
    }
    return c.PlayerBehavior.create(fields);
  }
}
export class WorldMetadataSerde {
  static serialize(component: c.ReadonlyWorldMetadata) {
    const data = [];
    if (component.aabb !== null) {
      data[1 - 1] = component.aabb;
    }
    return data;
  }

  static deserialize(data: any): c.WorldMetadata {
    const fields: Partial<c.WorldMetadata> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.aabb = t.deserializeBox2(data[1]);
      } else if (data.aabb !== undefined) {
        fields.aabb = t.deserializeBox2(data.aabb);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.aabb = t.deserializeBox2(data[i]);
            break;
        }
      }
    }
    return c.WorldMetadata.create(fields);
  }
}
export class NpcMetadataSerde {
  static serialize(component: c.ReadonlyNpcMetadata) {
    const data = [];
    if (component.type_id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.type_id);
    }
    if (component.created_time !== null) {
      data[3 - 1] = component.created_time;
    }
    if (component.spawn_event_type_id !== null) {
      data[4 - 1] = t.serializeOptionalBiomesId(component.spawn_event_type_id);
    }
    if (component.spawn_event_id !== null) {
      data[5 - 1] = t.serializeOptionalBiomesId(component.spawn_event_id);
    }
    if (component.spawn_position !== null) {
      data[6 - 1] = component.spawn_position;
    }
    if (component.spawn_orientation !== null) {
      data[7 - 1] = component.spawn_orientation;
    }
    return data;
  }

  static deserialize(data: any): c.NpcMetadata {
    const fields: Partial<c.NpcMetadata> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.type_id = t.deserializeBiomesId(data[1]);
      } else if (data.type_id !== undefined) {
        fields.type_id = t.deserializeBiomesId(data.type_id);
      }
      if (data[3] !== undefined) {
        fields.created_time = t.deserializeF64(data[3]);
      } else if (data.created_time !== undefined) {
        fields.created_time = t.deserializeF64(data.created_time);
      }
      if (data[4] !== undefined) {
        fields.spawn_event_type_id = t.deserializeOptionalBiomesId(data[4]);
      } else if (data.spawn_event_type_id !== undefined) {
        fields.spawn_event_type_id = t.deserializeOptionalBiomesId(
          data.spawn_event_type_id
        );
      }
      if (data[5] !== undefined) {
        fields.spawn_event_id = t.deserializeOptionalBiomesId(data[5]);
      } else if (data.spawn_event_id !== undefined) {
        fields.spawn_event_id = t.deserializeOptionalBiomesId(
          data.spawn_event_id
        );
      }
      if (data[6] !== undefined) {
        fields.spawn_position = t.deserializeVec3f(data[6]);
      } else if (data.spawn_position !== undefined) {
        fields.spawn_position = t.deserializeVec3f(data.spawn_position);
      }
      if (data[7] !== undefined) {
        fields.spawn_orientation = t.deserializeVec2f(data[7]);
      } else if (data.spawn_orientation !== undefined) {
        fields.spawn_orientation = t.deserializeVec2f(data.spawn_orientation);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.type_id = t.deserializeBiomesId(data[i]);
            break;
          case 3:
            fields.created_time = t.deserializeF64(data[i]);
            break;
          case 4:
            fields.spawn_event_type_id = t.deserializeOptionalBiomesId(data[i]);
            break;
          case 5:
            fields.spawn_event_id = t.deserializeOptionalBiomesId(data[i]);
            break;
          case 6:
            fields.spawn_position = t.deserializeVec3f(data[i]);
            break;
          case 7:
            fields.spawn_orientation = t.deserializeVec2f(data[i]);
            break;
        }
      }
    }
    return c.NpcMetadata.create(fields);
  }
}
export class NpcStateSerde {
  static serialize(component: c.ReadonlyNpcState) {
    const data = [];
    if (component.data !== null) {
      data[2 - 1] = component.data;
    }
    return data;
  }

  static deserialize(data: any): c.NpcState {
    const fields: Partial<c.NpcState> = {};
    if (!Array.isArray(data)) {
      if (data[2] !== undefined) {
        fields.data = t.deserializeBuffer(data[2]);
      } else if (data.data !== undefined) {
        fields.data = t.deserializeBuffer(data.data);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 2:
            fields.data = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.NpcState.create(fields);
  }
}
export class GroupPreviewReferenceSerde {
  static serialize(component: c.ReadonlyGroupPreviewReference) {
    const data = [];
    if (component.ref !== null) {
      data[1 - 1] = t.serializeOptionalBiomesId(component.ref);
    }
    return data;
  }

  static deserialize(data: any): c.GroupPreviewReference {
    const fields: Partial<c.GroupPreviewReference> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.ref = t.deserializeOptionalBiomesId(data[1]);
      } else if (data.ref !== undefined) {
        fields.ref = t.deserializeOptionalBiomesId(data.ref);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.ref = t.deserializeOptionalBiomesId(data[i]);
            break;
        }
      }
    }
    return c.GroupPreviewReference.create(fields);
  }
}
export class AclComponentSerde {
  static serialize(component: c.ReadonlyAclComponent) {
    const data = [];
    if (component.acl !== null) {
      data[1 - 1] = t.serializeAcl(component.acl);
    }
    return data;
  }

  static deserialize(data: any): c.AclComponent {
    const fields: Partial<c.AclComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.acl = t.deserializeAcl(data[1]);
      } else if (data.acl !== undefined) {
        fields.acl = t.deserializeAcl(data.acl);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.acl = t.deserializeAcl(data[i]);
            break;
        }
      }
    }
    return c.AclComponent.create(fields);
  }
}
export class DeedComponentSerde {
  static serialize(component: c.ReadonlyDeedComponent) {
    const data = [];
    if (component.owner !== null) {
      data[1 - 1] = t.serializeBiomesId(component.owner);
    }
    if (component.description !== null) {
      data[2 - 1] = component.description;
    }
    if (component.plots !== null) {
      data[3 - 1] = t.serializeBiomesIdList(component.plots);
    }
    if (component.custom_owner_name !== null) {
      data[4 - 1] = component.custom_owner_name;
    }
    if (component.map_display_size !== null) {
      data[5 - 1] = component.map_display_size;
    }
    return data;
  }

  static deserialize(data: any): c.DeedComponent {
    const fields: Partial<c.DeedComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.owner = t.deserializeBiomesId(data[1]);
      } else if (data.owner !== undefined) {
        fields.owner = t.deserializeBiomesId(data.owner);
      }
      if (data[2] !== undefined) {
        fields.description = t.deserializeString(data[2]);
      } else if (data.description !== undefined) {
        fields.description = t.deserializeString(data.description);
      }
      if (data[3] !== undefined) {
        fields.plots = t.deserializeBiomesIdList(data[3]);
      } else if (data.plots !== undefined) {
        fields.plots = t.deserializeBiomesIdList(data.plots);
      }
      if (data[4] !== undefined) {
        fields.custom_owner_name = t.deserializeOptionalString(data[4]);
      } else if (data.custom_owner_name !== undefined) {
        fields.custom_owner_name = t.deserializeOptionalString(
          data.custom_owner_name
        );
      }
      if (data[5] !== undefined) {
        fields.map_display_size = t.deserializeOptionalU32(data[5]);
      } else if (data.map_display_size !== undefined) {
        fields.map_display_size = t.deserializeOptionalU32(
          data.map_display_size
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.owner = t.deserializeBiomesId(data[i]);
            break;
          case 2:
            fields.description = t.deserializeString(data[i]);
            break;
          case 3:
            fields.plots = t.deserializeBiomesIdList(data[i]);
            break;
          case 4:
            fields.custom_owner_name = t.deserializeOptionalString(data[i]);
            break;
          case 5:
            fields.map_display_size = t.deserializeOptionalU32(data[i]);
            break;
        }
      }
    }
    return c.DeedComponent.create(fields);
  }
}
export class GroupPreviewComponentSerde {
  static serialize(component: c.ReadonlyGroupPreviewComponent) {
    const data = [];
    if (component.owner_id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.owner_id);
    }
    if (component.blueprint_id !== null) {
      data[2 - 1] = t.serializeOptionalBiomesId(component.blueprint_id);
    }
    return data;
  }

  static deserialize(data: any): c.GroupPreviewComponent {
    const fields: Partial<c.GroupPreviewComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.owner_id = t.deserializeBiomesId(data[1]);
      } else if (data.owner_id !== undefined) {
        fields.owner_id = t.deserializeBiomesId(data.owner_id);
      }
      if (data[2] !== undefined) {
        fields.blueprint_id = t.deserializeOptionalBiomesId(data[2]);
      } else if (data.blueprint_id !== undefined) {
        fields.blueprint_id = t.deserializeOptionalBiomesId(data.blueprint_id);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.owner_id = t.deserializeBiomesId(data[i]);
            break;
          case 2:
            fields.blueprint_id = t.deserializeOptionalBiomesId(data[i]);
            break;
        }
      }
    }
    return c.GroupPreviewComponent.create(fields);
  }
}
export class BlueprintComponentSerde {
  static serialize(component: c.ReadonlyBlueprintComponent) {
    const data = [];
    if (component.owner_id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.owner_id);
    }
    if (component.blueprint_id !== null) {
      data[2 - 1] = t.serializeBiomesId(component.blueprint_id);
    }
    return data;
  }

  static deserialize(data: any): c.BlueprintComponent {
    const fields: Partial<c.BlueprintComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.owner_id = t.deserializeBiomesId(data[1]);
      } else if (data.owner_id !== undefined) {
        fields.owner_id = t.deserializeBiomesId(data.owner_id);
      }
      if (data[2] !== undefined) {
        fields.blueprint_id = t.deserializeBiomesId(data[2]);
      } else if (data.blueprint_id !== undefined) {
        fields.blueprint_id = t.deserializeBiomesId(data.blueprint_id);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.owner_id = t.deserializeBiomesId(data[i]);
            break;
          case 2:
            fields.blueprint_id = t.deserializeBiomesId(data[i]);
            break;
        }
      }
    }
    return c.BlueprintComponent.create(fields);
  }
}
export class CraftingStationComponentSerde {
  static serialize(_: any) {
    return [];
  }

  static deserialize(data: any): c.CraftingStationComponent {
    const fields: Partial<c.CraftingStationComponent> = {};
    if (!Array.isArray(data)) {
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
        }
      }
    }
    return c.CraftingStationComponent.create(fields);
  }
}
export class HealthSerde {
  static serialize(component: c.ReadonlyHealth) {
    const data = [];
    if (component.hp !== null) {
      data[1 - 1] = component.hp;
    }
    if (component.maxHp !== null) {
      data[2 - 1] = component.maxHp;
    }
    if (component.lastDamageSource !== null) {
      data[3 - 1] = t.serializeOptionalDamageSource(component.lastDamageSource);
    }
    if (component.lastDamageTime !== null) {
      data[4 - 1] = component.lastDamageTime;
    }
    if (component.lastDamageInventoryConsequence !== null) {
      data[5 - 1] = t.serializeOptionalItemBag(
        component.lastDamageInventoryConsequence
      );
    }
    if (component.lastDamageAmount !== null) {
      data[6 - 1] = component.lastDamageAmount;
    }
    return data;
  }

  static deserialize(data: any): c.Health {
    const fields: Partial<c.Health> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.hp = t.deserializeI32(data[1]);
      } else if (data.hp !== undefined) {
        fields.hp = t.deserializeI32(data.hp);
      }
      if (data[2] !== undefined) {
        fields.maxHp = t.deserializeI32(data[2]);
      } else if (data.maxHp !== undefined) {
        fields.maxHp = t.deserializeI32(data.maxHp);
      }
      if (data[3] !== undefined) {
        fields.lastDamageSource = t.deserializeOptionalDamageSource(data[3]);
      } else if (data.lastDamageSource !== undefined) {
        fields.lastDamageSource = t.deserializeOptionalDamageSource(
          data.lastDamageSource
        );
      }
      if (data[4] !== undefined) {
        fields.lastDamageTime = t.deserializeOptionalF64(data[4]);
      } else if (data.lastDamageTime !== undefined) {
        fields.lastDamageTime = t.deserializeOptionalF64(data.lastDamageTime);
      }
      if (data[5] !== undefined) {
        fields.lastDamageInventoryConsequence = t.deserializeOptionalItemBag(
          data[5]
        );
      } else if (data.lastDamageInventoryConsequence !== undefined) {
        fields.lastDamageInventoryConsequence = t.deserializeOptionalItemBag(
          data.lastDamageInventoryConsequence
        );
      }
      if (data[6] !== undefined) {
        fields.lastDamageAmount = t.deserializeOptionalI32(data[6]);
      } else if (data.lastDamageAmount !== undefined) {
        fields.lastDamageAmount = t.deserializeOptionalI32(
          data.lastDamageAmount
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.hp = t.deserializeI32(data[i]);
            break;
          case 2:
            fields.maxHp = t.deserializeI32(data[i]);
            break;
          case 3:
            fields.lastDamageSource = t.deserializeOptionalDamageSource(
              data[i]
            );
            break;
          case 4:
            fields.lastDamageTime = t.deserializeOptionalF64(data[i]);
            break;
          case 5:
            fields.lastDamageInventoryConsequence =
              t.deserializeOptionalItemBag(data[i]);
            break;
          case 6:
            fields.lastDamageAmount = t.deserializeOptionalI32(data[i]);
            break;
        }
      }
    }
    return c.Health.create(fields);
  }
}
export class BuffsComponentSerde {
  static serialize(component: c.ReadonlyBuffsComponent) {
    const data = [];
    if (component.buffs !== null) {
      data[1 - 1] = t.serializeBuffsList(component.buffs);
    }
    if (component.trigger_at !== null) {
      data[2 - 1] = component.trigger_at;
    }
    return data;
  }

  static deserialize(data: any): c.BuffsComponent {
    const fields: Partial<c.BuffsComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.buffs = t.deserializeBuffsList(data[1]);
      } else if (data.buffs !== undefined) {
        fields.buffs = t.deserializeBuffsList(data.buffs);
      }
      if (data[2] !== undefined) {
        fields.trigger_at = t.deserializeOptionalF64(data[2]);
      } else if (data.trigger_at !== undefined) {
        fields.trigger_at = t.deserializeOptionalF64(data.trigger_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.buffs = t.deserializeBuffsList(data[i]);
            break;
          case 2:
            fields.trigger_at = t.deserializeOptionalF64(data[i]);
            break;
        }
      }
    }
    return c.BuffsComponent.create(fields);
  }
}
export class GremlinSerde {
  static serialize(_: any) {
    return [];
  }

  static deserialize(data: any): c.Gremlin {
    const fields: Partial<c.Gremlin> = {};
    if (!Array.isArray(data)) {
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
        }
      }
    }
    return c.Gremlin.create(fields);
  }
}
export class PlaceableComponentSerde {
  static serialize(component: c.ReadonlyPlaceableComponent) {
    const data = [];
    if (component.item_id !== null) {
      data[2 - 1] = t.serializeBiomesId(component.item_id);
    }
    if (component.animation !== null) {
      data[3 - 1] = component.animation;
    }
    return data;
  }

  static deserialize(data: any): c.PlaceableComponent {
    const fields: Partial<c.PlaceableComponent> = {};
    if (!Array.isArray(data)) {
      if (data[2] !== undefined) {
        fields.item_id = t.deserializeBiomesId(data[2]);
      } else if (data.item_id !== undefined) {
        fields.item_id = t.deserializeBiomesId(data.item_id);
      }
      if (data[3] !== undefined) {
        fields.animation = t.deserializeOptionalPlaceableAnimation(data[3]);
      } else if (data.animation !== undefined) {
        fields.animation = t.deserializeOptionalPlaceableAnimation(
          data.animation
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 2:
            fields.item_id = t.deserializeBiomesId(data[i]);
            break;
          case 3:
            fields.animation = t.deserializeOptionalPlaceableAnimation(data[i]);
            break;
        }
      }
    }
    return c.PlaceableComponent.create(fields);
  }
}
export class GroupedEntitiesSerde {
  static serialize(component: c.ReadonlyGroupedEntities) {
    const data = [];
    if (component.ids !== null) {
      data[1 - 1] = t.serializeBiomesIdList(component.ids);
    }
    return data;
  }

  static deserialize(data: any): c.GroupedEntities {
    const fields: Partial<c.GroupedEntities> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.ids = t.deserializeBiomesIdList(data[1]);
      } else if (data.ids !== undefined) {
        fields.ids = t.deserializeBiomesIdList(data.ids);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.ids = t.deserializeBiomesIdList(data[i]);
            break;
        }
      }
    }
    return c.GroupedEntities.create(fields);
  }
}
export class InGroupSerde {
  static serialize(component: c.ReadonlyInGroup) {
    const data = [];
    if (component.id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.id);
    }
    return data;
  }

  static deserialize(data: any): c.InGroup {
    const fields: Partial<c.InGroup> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.id = t.deserializeBiomesId(data[1]);
      } else if (data.id !== undefined) {
        fields.id = t.deserializeBiomesId(data.id);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.id = t.deserializeBiomesId(data[i]);
            break;
        }
      }
    }
    return c.InGroup.create(fields);
  }
}
export class PictureFrameContentsSerde {
  static serialize(component: c.ReadonlyPictureFrameContents) {
    const data = [];
    if (component.placer_id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.placer_id);
    }
    if (component.photo_id !== null) {
      data[2 - 1] = t.serializeOptionalBiomesId(component.photo_id);
    }
    if (component.minigame_id !== null) {
      data[4 - 1] = t.serializeOptionalBiomesId(component.minigame_id);
    }
    return data;
  }

  static deserialize(data: any): c.PictureFrameContents {
    const fields: Partial<c.PictureFrameContents> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.placer_id = t.deserializeBiomesId(data[1]);
      } else if (data.placer_id !== undefined) {
        fields.placer_id = t.deserializeBiomesId(data.placer_id);
      }
      if (data[2] !== undefined) {
        fields.photo_id = t.deserializeOptionalBiomesId(data[2]);
      } else if (data.photo_id !== undefined) {
        fields.photo_id = t.deserializeOptionalBiomesId(data.photo_id);
      }
      if (data[4] !== undefined) {
        fields.minigame_id = t.deserializeOptionalBiomesId(data[4]);
      } else if (data.minigame_id !== undefined) {
        fields.minigame_id = t.deserializeOptionalBiomesId(data.minigame_id);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.placer_id = t.deserializeBiomesId(data[i]);
            break;
          case 2:
            fields.photo_id = t.deserializeOptionalBiomesId(data[i]);
            break;
          case 4:
            fields.minigame_id = t.deserializeOptionalBiomesId(data[i]);
            break;
        }
      }
    }
    return c.PictureFrameContents.create(fields);
  }
}
export class TriggerStateSerde {
  static serialize(component: c.ReadonlyTriggerState) {
    const data = [];
    if (component.by_root !== null) {
      data[3 - 1] = t.serializeTriggerTrees(component.by_root);
    }
    return data;
  }

  static deserialize(data: any): c.TriggerState {
    const fields: Partial<c.TriggerState> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.by_root = t.deserializeTriggerTrees(data[3]);
      } else if (data.by_root !== undefined) {
        fields.by_root = t.deserializeTriggerTrees(data.by_root);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.by_root = t.deserializeTriggerTrees(data[i]);
            break;
        }
      }
    }
    return c.TriggerState.create(fields);
  }
}
export class LifetimeStatsSerde {
  static serialize(component: c.ReadonlyLifetimeStats) {
    const data = [];
    if (component.stats !== null) {
      data[3 - 1] = t.serializeLifetimeStatsMap(component.stats);
    }
    return data;
  }

  static deserialize(data: any): c.LifetimeStats {
    const fields: Partial<c.LifetimeStats> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.stats = t.deserializeLifetimeStatsMap(data[3]);
      } else if (data.stats !== undefined) {
        fields.stats = t.deserializeLifetimeStatsMap(data.stats);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.stats = t.deserializeLifetimeStatsMap(data[i]);
            break;
        }
      }
    }
    return c.LifetimeStats.create(fields);
  }
}
export class OccupancyComponentSerde {
  static serialize(component: c.ReadonlyOccupancyComponent) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.OccupancyComponent {
    const fields: Partial<c.OccupancyComponent> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeOptionalBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeOptionalBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeOptionalBuffer(data[i]);
            break;
        }
      }
    }
    return c.OccupancyComponent.create(fields);
  }
}
export class VideoComponentSerde {
  static serialize(component: c.ReadonlyVideoComponent) {
    const data = [];
    if (component.video_url !== null) {
      data[1 - 1] = component.video_url;
    }
    if (component.video_start_time !== null) {
      data[2 - 1] = component.video_start_time;
    }
    if (component.muted !== null) {
      data[3 - 1] = component.muted;
    }
    return data;
  }

  static deserialize(data: any): c.VideoComponent {
    const fields: Partial<c.VideoComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.video_url = t.deserializeOptionalString(data[1]);
      } else if (data.video_url !== undefined) {
        fields.video_url = t.deserializeOptionalString(data.video_url);
      }
      if (data[2] !== undefined) {
        fields.video_start_time = t.deserializeOptionalF64(data[2]);
      } else if (data.video_start_time !== undefined) {
        fields.video_start_time = t.deserializeOptionalF64(
          data.video_start_time
        );
      }
      if (data[3] !== undefined) {
        fields.muted = t.deserializeOptionalBool(data[3]);
      } else if (data.muted !== undefined) {
        fields.muted = t.deserializeOptionalBool(data.muted);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.video_url = t.deserializeOptionalString(data[i]);
            break;
          case 2:
            fields.video_start_time = t.deserializeOptionalF64(data[i]);
            break;
          case 3:
            fields.muted = t.deserializeOptionalBool(data[i]);
            break;
        }
      }
    }
    return c.VideoComponent.create(fields);
  }
}
export class PlayerSessionSerde {
  static serialize(component: c.ReadonlyPlayerSession) {
    const data = [];
    if (component.id !== null) {
      data[1 - 1] = component.id;
    }
    return data;
  }

  static deserialize(data: any): c.PlayerSession {
    const fields: Partial<c.PlayerSession> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.id = t.deserializeString(data[1]);
      } else if (data.id !== undefined) {
        fields.id = t.deserializeString(data.id);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.id = t.deserializeString(data[i]);
            break;
        }
      }
    }
    return c.PlayerSession.create(fields);
  }
}
export class PresetAppliedSerde {
  static serialize(component: c.ReadonlyPresetApplied) {
    const data = [];
    if (component.preset_id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.preset_id);
    }
    if (component.applier_id !== null) {
      data[2 - 1] = t.serializeBiomesId(component.applier_id);
    }
    if (component.applied_at !== null) {
      data[3 - 1] = component.applied_at;
    }
    return data;
  }

  static deserialize(data: any): c.PresetApplied {
    const fields: Partial<c.PresetApplied> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.preset_id = t.deserializeBiomesId(data[1]);
      } else if (data.preset_id !== undefined) {
        fields.preset_id = t.deserializeBiomesId(data.preset_id);
      }
      if (data[2] !== undefined) {
        fields.applier_id = t.deserializeBiomesId(data[2]);
      } else if (data.applier_id !== undefined) {
        fields.applier_id = t.deserializeBiomesId(data.applier_id);
      }
      if (data[3] !== undefined) {
        fields.applied_at = t.deserializeF64(data[3]);
      } else if (data.applied_at !== undefined) {
        fields.applied_at = t.deserializeF64(data.applied_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.preset_id = t.deserializeBiomesId(data[i]);
            break;
          case 2:
            fields.applier_id = t.deserializeBiomesId(data[i]);
            break;
          case 3:
            fields.applied_at = t.deserializeF64(data[i]);
            break;
        }
      }
    }
    return c.PresetApplied.create(fields);
  }
}
export class PresetPrototypeSerde {
  static serialize(component: c.ReadonlyPresetPrototype) {
    const data = [];
    if (component.last_updated !== null) {
      data[1 - 1] = component.last_updated;
    }
    if (component.last_updated_by !== null) {
      data[2 - 1] = t.serializeBiomesId(component.last_updated_by);
    }
    return data;
  }

  static deserialize(data: any): c.PresetPrototype {
    const fields: Partial<c.PresetPrototype> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.last_updated = t.deserializeF64(data[1]);
      } else if (data.last_updated !== undefined) {
        fields.last_updated = t.deserializeF64(data.last_updated);
      }
      if (data[2] !== undefined) {
        fields.last_updated_by = t.deserializeBiomesId(data[2]);
      } else if (data.last_updated_by !== undefined) {
        fields.last_updated_by = t.deserializeBiomesId(data.last_updated_by);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.last_updated = t.deserializeF64(data[i]);
            break;
          case 2:
            fields.last_updated_by = t.deserializeBiomesId(data[i]);
            break;
        }
      }
    }
    return c.PresetPrototype.create(fields);
  }
}
export class FarmingPlantComponentSerde {
  static serialize(component: c.ReadonlyFarmingPlantComponent) {
    const data = [];
    if (component.planter !== null) {
      data[1 - 1] = t.serializeBiomesId(component.planter);
    }
    if (component.seed !== null) {
      data[2 - 1] = t.serializeBiomesId(component.seed);
    }
    if (component.plant_time !== null) {
      data[3 - 1] = component.plant_time;
    }
    if (component.last_tick !== null) {
      data[4 - 1] = component.last_tick;
    }
    if (component.stage !== null) {
      data[5 - 1] = component.stage;
    }
    if (component.stage_progress !== null) {
      data[6 - 1] = component.stage_progress;
    }
    if (component.water_level !== null) {
      data[7 - 1] = component.water_level;
    }
    if (component.wilt !== null) {
      data[8 - 1] = component.wilt;
    }
    if (component.expected_blocks !== null) {
      data[9 - 1] = component.expected_blocks;
    }
    if (component.status !== null) {
      data[10 - 1] = component.status;
    }
    if (component.variant !== null) {
      data[11 - 1] = component.variant;
    }
    if (component.buffs !== null) {
      data[12 - 1] = t.serializeBiomesIdList(component.buffs);
    }
    if (component.water_at !== null) {
      data[14 - 1] = component.water_at;
    }
    if (component.player_actions !== null) {
      data[15 - 1] = t.serializeFarmingPlayerActionList(
        component.player_actions
      );
    }
    if (component.fully_grown_at !== null) {
      data[16 - 1] = component.fully_grown_at;
    }
    if (component.next_stage_at !== null) {
      data[17 - 1] = component.next_stage_at;
    }
    return data;
  }

  static deserialize(data: any): c.FarmingPlantComponent {
    const fields: Partial<c.FarmingPlantComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.planter = t.deserializeBiomesId(data[1]);
      } else if (data.planter !== undefined) {
        fields.planter = t.deserializeBiomesId(data.planter);
      }
      if (data[2] !== undefined) {
        fields.seed = t.deserializeBiomesId(data[2]);
      } else if (data.seed !== undefined) {
        fields.seed = t.deserializeBiomesId(data.seed);
      }
      if (data[3] !== undefined) {
        fields.plant_time = t.deserializeF64(data[3]);
      } else if (data.plant_time !== undefined) {
        fields.plant_time = t.deserializeF64(data.plant_time);
      }
      if (data[4] !== undefined) {
        fields.last_tick = t.deserializeF64(data[4]);
      } else if (data.last_tick !== undefined) {
        fields.last_tick = t.deserializeF64(data.last_tick);
      }
      if (data[5] !== undefined) {
        fields.stage = t.deserializeI32(data[5]);
      } else if (data.stage !== undefined) {
        fields.stage = t.deserializeI32(data.stage);
      }
      if (data[6] !== undefined) {
        fields.stage_progress = t.deserializeF64(data[6]);
      } else if (data.stage_progress !== undefined) {
        fields.stage_progress = t.deserializeF64(data.stage_progress);
      }
      if (data[7] !== undefined) {
        fields.water_level = t.deserializeF64(data[7]);
      } else if (data.water_level !== undefined) {
        fields.water_level = t.deserializeF64(data.water_level);
      }
      if (data[8] !== undefined) {
        fields.wilt = t.deserializeF64(data[8]);
      } else if (data.wilt !== undefined) {
        fields.wilt = t.deserializeF64(data.wilt);
      }
      if (data[9] !== undefined) {
        fields.expected_blocks = t.deserializeOptionalTensorBlob(data[9]);
      } else if (data.expected_blocks !== undefined) {
        fields.expected_blocks = t.deserializeOptionalTensorBlob(
          data.expected_blocks
        );
      }
      if (data[10] !== undefined) {
        fields.status = t.deserializePlantStatus(data[10]);
      } else if (data.status !== undefined) {
        fields.status = t.deserializePlantStatus(data.status);
      }
      if (data[11] !== undefined) {
        fields.variant = t.deserializeOptionalI32(data[11]);
      } else if (data.variant !== undefined) {
        fields.variant = t.deserializeOptionalI32(data.variant);
      }
      if (data[12] !== undefined) {
        fields.buffs = t.deserializeBiomesIdList(data[12]);
      } else if (data.buffs !== undefined) {
        fields.buffs = t.deserializeBiomesIdList(data.buffs);
      }
      if (data[14] !== undefined) {
        fields.water_at = t.deserializeOptionalF64(data[14]);
      } else if (data.water_at !== undefined) {
        fields.water_at = t.deserializeOptionalF64(data.water_at);
      }
      if (data[15] !== undefined) {
        fields.player_actions = t.deserializeFarmingPlayerActionList(data[15]);
      } else if (data.player_actions !== undefined) {
        fields.player_actions = t.deserializeFarmingPlayerActionList(
          data.player_actions
        );
      }
      if (data[16] !== undefined) {
        fields.fully_grown_at = t.deserializeOptionalF64(data[16]);
      } else if (data.fully_grown_at !== undefined) {
        fields.fully_grown_at = t.deserializeOptionalF64(data.fully_grown_at);
      }
      if (data[17] !== undefined) {
        fields.next_stage_at = t.deserializeOptionalF64(data[17]);
      } else if (data.next_stage_at !== undefined) {
        fields.next_stage_at = t.deserializeOptionalF64(data.next_stage_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.planter = t.deserializeBiomesId(data[i]);
            break;
          case 2:
            fields.seed = t.deserializeBiomesId(data[i]);
            break;
          case 3:
            fields.plant_time = t.deserializeF64(data[i]);
            break;
          case 4:
            fields.last_tick = t.deserializeF64(data[i]);
            break;
          case 5:
            fields.stage = t.deserializeI32(data[i]);
            break;
          case 6:
            fields.stage_progress = t.deserializeF64(data[i]);
            break;
          case 7:
            fields.water_level = t.deserializeF64(data[i]);
            break;
          case 8:
            fields.wilt = t.deserializeF64(data[i]);
            break;
          case 9:
            fields.expected_blocks = t.deserializeOptionalTensorBlob(data[i]);
            break;
          case 10:
            fields.status = t.deserializePlantStatus(data[i]);
            break;
          case 11:
            fields.variant = t.deserializeOptionalI32(data[i]);
            break;
          case 12:
            fields.buffs = t.deserializeBiomesIdList(data[i]);
            break;
          case 14:
            fields.water_at = t.deserializeOptionalF64(data[i]);
            break;
          case 15:
            fields.player_actions = t.deserializeFarmingPlayerActionList(
              data[i]
            );
            break;
          case 16:
            fields.fully_grown_at = t.deserializeOptionalF64(data[i]);
            break;
          case 17:
            fields.next_stage_at = t.deserializeOptionalF64(data[i]);
            break;
        }
      }
    }
    return c.FarmingPlantComponent.create(fields);
  }
}
export class ShardFarmingSerde {
  static serialize(component: c.ReadonlyShardFarming) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.ShardFarming {
    const fields: Partial<c.ShardFarming> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeBuffer(data[i]);
            break;
        }
      }
    }
    return c.ShardFarming.create(fields);
  }
}
export class CreatedBySerde {
  static serialize(component: c.ReadonlyCreatedBy) {
    const data = [];
    if (component.id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.id);
    }
    if (component.created_at !== null) {
      data[2 - 1] = component.created_at;
    }
    return data;
  }

  static deserialize(data: any): c.CreatedBy {
    const fields: Partial<c.CreatedBy> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.id = t.deserializeBiomesId(data[1]);
      } else if (data.id !== undefined) {
        fields.id = t.deserializeBiomesId(data.id);
      }
      if (data[2] !== undefined) {
        fields.created_at = t.deserializeF64(data[2]);
      } else if (data.created_at !== undefined) {
        fields.created_at = t.deserializeF64(data.created_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.id = t.deserializeBiomesId(data[i]);
            break;
          case 2:
            fields.created_at = t.deserializeF64(data[i]);
            break;
        }
      }
    }
    return c.CreatedBy.create(fields);
  }
}
export class MinigameComponentSerde {
  static serialize(component: c.ReadonlyMinigameComponent) {
    const data = [];
    if (component.metadata !== null) {
      data[1 - 1] = t.serializeMinigameMetadata(component.metadata);
    }
    if (component.stats_changed_at !== null) {
      data[2 - 1] = component.stats_changed_at;
    }
    if (component.ready !== null) {
      data[3 - 1] = component.ready;
    }
    if (component.minigame_element_ids !== null) {
      data[4 - 1] = t.serializeBiomesIdSet(component.minigame_element_ids);
    }
    if (component.active_instance_ids !== null) {
      data[5 - 1] = t.serializeBiomesIdSet(component.active_instance_ids);
    }
    if (component.hero_photo_id !== null) {
      data[6 - 1] = t.serializeOptionalBiomesId(component.hero_photo_id);
    }
    if (component.minigame_settings !== null) {
      data[7 - 1] = component.minigame_settings;
    }
    if (component.entry_price !== null) {
      data[8 - 1] = component.entry_price;
    }
    if (component.game_modified_at !== null) {
      data[10 - 1] = component.game_modified_at;
    }
    return data;
  }

  static deserialize(data: any): c.MinigameComponent {
    const fields: Partial<c.MinigameComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.metadata = t.deserializeMinigameMetadata(data[1]);
      } else if (data.metadata !== undefined) {
        fields.metadata = t.deserializeMinigameMetadata(data.metadata);
      }
      if (data[2] !== undefined) {
        fields.stats_changed_at = t.deserializeOptionalF64(data[2]);
      } else if (data.stats_changed_at !== undefined) {
        fields.stats_changed_at = t.deserializeOptionalF64(
          data.stats_changed_at
        );
      }
      if (data[3] !== undefined) {
        fields.ready = t.deserializeBool(data[3]);
      } else if (data.ready !== undefined) {
        fields.ready = t.deserializeBool(data.ready);
      }
      if (data[4] !== undefined) {
        fields.minigame_element_ids = t.deserializeBiomesIdSet(data[4]);
      } else if (data.minigame_element_ids !== undefined) {
        fields.minigame_element_ids = t.deserializeBiomesIdSet(
          data.minigame_element_ids
        );
      }
      if (data[5] !== undefined) {
        fields.active_instance_ids = t.deserializeBiomesIdSet(data[5]);
      } else if (data.active_instance_ids !== undefined) {
        fields.active_instance_ids = t.deserializeBiomesIdSet(
          data.active_instance_ids
        );
      }
      if (data[6] !== undefined) {
        fields.hero_photo_id = t.deserializeOptionalBiomesId(data[6]);
      } else if (data.hero_photo_id !== undefined) {
        fields.hero_photo_id = t.deserializeOptionalBiomesId(
          data.hero_photo_id
        );
      }
      if (data[7] !== undefined) {
        fields.minigame_settings = t.deserializeOptionalBuffer(data[7]);
      } else if (data.minigame_settings !== undefined) {
        fields.minigame_settings = t.deserializeOptionalBuffer(
          data.minigame_settings
        );
      }
      if (data[8] !== undefined) {
        fields.entry_price = t.deserializeOptionalF64(data[8]);
      } else if (data.entry_price !== undefined) {
        fields.entry_price = t.deserializeOptionalF64(data.entry_price);
      }
      if (data[10] !== undefined) {
        fields.game_modified_at = t.deserializeOptionalF64(data[10]);
      } else if (data.game_modified_at !== undefined) {
        fields.game_modified_at = t.deserializeOptionalF64(
          data.game_modified_at
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.metadata = t.deserializeMinigameMetadata(data[i]);
            break;
          case 2:
            fields.stats_changed_at = t.deserializeOptionalF64(data[i]);
            break;
          case 3:
            fields.ready = t.deserializeBool(data[i]);
            break;
          case 4:
            fields.minigame_element_ids = t.deserializeBiomesIdSet(data[i]);
            break;
          case 5:
            fields.active_instance_ids = t.deserializeBiomesIdSet(data[i]);
            break;
          case 6:
            fields.hero_photo_id = t.deserializeOptionalBiomesId(data[i]);
            break;
          case 7:
            fields.minigame_settings = t.deserializeOptionalBuffer(data[i]);
            break;
          case 8:
            fields.entry_price = t.deserializeOptionalF64(data[i]);
            break;
          case 10:
            fields.game_modified_at = t.deserializeOptionalF64(data[i]);
            break;
        }
      }
    }
    return c.MinigameComponent.create(fields);
  }
}
export class MinigameInstanceSerde {
  static serialize(component: c.ReadonlyMinigameInstance) {
    const data = [];
    if (component.state !== null) {
      data[1 - 1] = t.serializeMinigameInstanceState(component.state);
    }
    if (component.minigame_id !== null) {
      data[2 - 1] = t.serializeBiomesId(component.minigame_id);
    }
    if (component.finished !== null) {
      data[3 - 1] = component.finished;
    }
    if (component.active_players !== null) {
      data[4 - 1] = t.serializeMinigameInstanceActivePlayerMap(
        component.active_players
      );
    }
    if (component.space_clipboard !== null) {
      data[6 - 1] = t.serializeOptionalMinigameInstanceSpaceClipboardInfo(
        component.space_clipboard
      );
    }
    if (component.instance_element_ids !== null) {
      data[7 - 1] = t.serializeBiomesIdSet(component.instance_element_ids);
    }
    return data;
  }

  static deserialize(data: any): c.MinigameInstance {
    const fields: Partial<c.MinigameInstance> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.state = t.deserializeMinigameInstanceState(data[1]);
      } else if (data.state !== undefined) {
        fields.state = t.deserializeMinigameInstanceState(data.state);
      }
      if (data[2] !== undefined) {
        fields.minigame_id = t.deserializeBiomesId(data[2]);
      } else if (data.minigame_id !== undefined) {
        fields.minigame_id = t.deserializeBiomesId(data.minigame_id);
      }
      if (data[3] !== undefined) {
        fields.finished = t.deserializeBool(data[3]);
      } else if (data.finished !== undefined) {
        fields.finished = t.deserializeBool(data.finished);
      }
      if (data[4] !== undefined) {
        fields.active_players = t.deserializeMinigameInstanceActivePlayerMap(
          data[4]
        );
      } else if (data.active_players !== undefined) {
        fields.active_players = t.deserializeMinigameInstanceActivePlayerMap(
          data.active_players
        );
      }
      if (data[6] !== undefined) {
        fields.space_clipboard =
          t.deserializeOptionalMinigameInstanceSpaceClipboardInfo(data[6]);
      } else if (data.space_clipboard !== undefined) {
        fields.space_clipboard =
          t.deserializeOptionalMinigameInstanceSpaceClipboardInfo(
            data.space_clipboard
          );
      }
      if (data[7] !== undefined) {
        fields.instance_element_ids = t.deserializeBiomesIdSet(data[7]);
      } else if (data.instance_element_ids !== undefined) {
        fields.instance_element_ids = t.deserializeBiomesIdSet(
          data.instance_element_ids
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.state = t.deserializeMinigameInstanceState(data[i]);
            break;
          case 2:
            fields.minigame_id = t.deserializeBiomesId(data[i]);
            break;
          case 3:
            fields.finished = t.deserializeBool(data[i]);
            break;
          case 4:
            fields.active_players =
              t.deserializeMinigameInstanceActivePlayerMap(data[i]);
            break;
          case 6:
            fields.space_clipboard =
              t.deserializeOptionalMinigameInstanceSpaceClipboardInfo(data[i]);
            break;
          case 7:
            fields.instance_element_ids = t.deserializeBiomesIdSet(data[i]);
            break;
        }
      }
    }
    return c.MinigameInstance.create(fields);
  }
}
export class PlayingMinigameSerde {
  static serialize(component: c.ReadonlyPlayingMinigame) {
    const data = [];
    if (component.minigame_id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.minigame_id);
    }
    if (component.minigame_instance_id !== null) {
      data[2 - 1] = t.serializeBiomesId(component.minigame_instance_id);
    }
    if (component.minigame_type !== null) {
      data[3 - 1] = component.minigame_type;
    }
    return data;
  }

  static deserialize(data: any): c.PlayingMinigame {
    const fields: Partial<c.PlayingMinigame> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.minigame_id = t.deserializeBiomesId(data[1]);
      } else if (data.minigame_id !== undefined) {
        fields.minigame_id = t.deserializeBiomesId(data.minigame_id);
      }
      if (data[2] !== undefined) {
        fields.minigame_instance_id = t.deserializeBiomesId(data[2]);
      } else if (data.minigame_instance_id !== undefined) {
        fields.minigame_instance_id = t.deserializeBiomesId(
          data.minigame_instance_id
        );
      }
      if (data[3] !== undefined) {
        fields.minigame_type = t.deserializeMinigameType(data[3]);
      } else if (data.minigame_type !== undefined) {
        fields.minigame_type = t.deserializeMinigameType(data.minigame_type);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.minigame_id = t.deserializeBiomesId(data[i]);
            break;
          case 2:
            fields.minigame_instance_id = t.deserializeBiomesId(data[i]);
            break;
          case 3:
            fields.minigame_type = t.deserializeMinigameType(data[i]);
            break;
        }
      }
    }
    return c.PlayingMinigame.create(fields);
  }
}
export class MinigameElementSerde {
  static serialize(component: c.ReadonlyMinigameElement) {
    const data = [];
    if (component.minigame_id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.minigame_id);
    }
    return data;
  }

  static deserialize(data: any): c.MinigameElement {
    const fields: Partial<c.MinigameElement> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.minigame_id = t.deserializeBiomesId(data[1]);
      } else if (data.minigame_id !== undefined) {
        fields.minigame_id = t.deserializeBiomesId(data.minigame_id);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.minigame_id = t.deserializeBiomesId(data[i]);
            break;
        }
      }
    }
    return c.MinigameElement.create(fields);
  }
}
export class ActiveTraySerde {
  static serialize(component: c.ReadonlyActiveTray) {
    const data = [];
    if (component.id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.id);
    }
    return data;
  }

  static deserialize(data: any): c.ActiveTray {
    const fields: Partial<c.ActiveTray> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.id = t.deserializeBiomesId(data[1]);
      } else if (data.id !== undefined) {
        fields.id = t.deserializeBiomesId(data.id);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.id = t.deserializeBiomesId(data[i]);
            break;
        }
      }
    }
    return c.ActiveTray.create(fields);
  }
}
export class StashedSerde {
  static serialize(component: c.ReadonlyStashed) {
    const data = [];
    if (component.stashed_at !== null) {
      data[1 - 1] = component.stashed_at;
    }
    if (component.stashed_by !== null) {
      data[2 - 1] = t.serializeBiomesId(component.stashed_by);
    }
    if (component.original_entity_id !== null) {
      data[3 - 1] = t.serializeBiomesId(component.original_entity_id);
    }
    return data;
  }

  static deserialize(data: any): c.Stashed {
    const fields: Partial<c.Stashed> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.stashed_at = t.deserializeF64(data[1]);
      } else if (data.stashed_at !== undefined) {
        fields.stashed_at = t.deserializeF64(data.stashed_at);
      }
      if (data[2] !== undefined) {
        fields.stashed_by = t.deserializeBiomesId(data[2]);
      } else if (data.stashed_by !== undefined) {
        fields.stashed_by = t.deserializeBiomesId(data.stashed_by);
      }
      if (data[3] !== undefined) {
        fields.original_entity_id = t.deserializeBiomesId(data[3]);
      } else if (data.original_entity_id !== undefined) {
        fields.original_entity_id = t.deserializeBiomesId(
          data.original_entity_id
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.stashed_at = t.deserializeF64(data[i]);
            break;
          case 2:
            fields.stashed_by = t.deserializeBiomesId(data[i]);
            break;
          case 3:
            fields.original_entity_id = t.deserializeBiomesId(data[i]);
            break;
        }
      }
    }
    return c.Stashed.create(fields);
  }
}
export class MinigameInstanceTickInfoSerde {
  static serialize(component: c.ReadonlyMinigameInstanceTickInfo) {
    const data = [];
    if (component.last_tick !== null) {
      data[1 - 1] = component.last_tick;
    }
    if (component.trigger_at !== null) {
      data[2 - 1] = component.trigger_at;
    }
    return data;
  }

  static deserialize(data: any): c.MinigameInstanceTickInfo {
    const fields: Partial<c.MinigameInstanceTickInfo> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.last_tick = t.deserializeF64(data[1]);
      } else if (data.last_tick !== undefined) {
        fields.last_tick = t.deserializeF64(data.last_tick);
      }
      if (data[2] !== undefined) {
        fields.trigger_at = t.deserializeF64(data[2]);
      } else if (data.trigger_at !== undefined) {
        fields.trigger_at = t.deserializeF64(data.trigger_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.last_tick = t.deserializeF64(data[i]);
            break;
          case 2:
            fields.trigger_at = t.deserializeF64(data[i]);
            break;
        }
      }
    }
    return c.MinigameInstanceTickInfo.create(fields);
  }
}
export class WarpingToSerde {
  static serialize(component: c.ReadonlyWarpingTo) {
    const data = [];
    if (component.position !== null) {
      data[1 - 1] = component.position;
    }
    if (component.orientation !== null) {
      data[2 - 1] = component.orientation;
    }
    if (component.set_at !== null) {
      data[3 - 1] = component.set_at;
    }
    return data;
  }

  static deserialize(data: any): c.WarpingTo {
    const fields: Partial<c.WarpingTo> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.position = t.deserializeVec3f(data[1]);
      } else if (data.position !== undefined) {
        fields.position = t.deserializeVec3f(data.position);
      }
      if (data[2] !== undefined) {
        fields.orientation = t.deserializeOptionalVec2f(data[2]);
      } else if (data.orientation !== undefined) {
        fields.orientation = t.deserializeOptionalVec2f(data.orientation);
      }
      if (data[3] !== undefined) {
        fields.set_at = t.deserializeF64(data[3]);
      } else if (data.set_at !== undefined) {
        fields.set_at = t.deserializeF64(data.set_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.position = t.deserializeVec3f(data[i]);
            break;
          case 2:
            fields.orientation = t.deserializeOptionalVec2f(data[i]);
            break;
          case 3:
            fields.set_at = t.deserializeF64(data[i]);
            break;
        }
      }
    }
    return c.WarpingTo.create(fields);
  }
}
export class MinigameInstanceExpireSerde {
  static serialize(component: c.ReadonlyMinigameInstanceExpire) {
    const data = [];
    if (component.trigger_at !== null) {
      data[1 - 1] = component.trigger_at;
    }
    return data;
  }

  static deserialize(data: any): c.MinigameInstanceExpire {
    const fields: Partial<c.MinigameInstanceExpire> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.trigger_at = t.deserializeF64(data[1]);
      } else if (data.trigger_at !== undefined) {
        fields.trigger_at = t.deserializeF64(data.trigger_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.trigger_at = t.deserializeF64(data[i]);
            break;
        }
      }
    }
    return c.MinigameInstanceExpire.create(fields);
  }
}
export class PlacerComponentSerde {
  static serialize(component: c.ReadonlyPlacerComponent) {
    const data = [];
    if (component.buffer !== null) {
      data[3 - 1] = component.buffer;
    }
    return data;
  }

  static deserialize(data: any): c.PlacerComponent {
    const fields: Partial<c.PlacerComponent> = {};
    if (!Array.isArray(data)) {
      if (data[3] !== undefined) {
        fields.buffer = t.deserializeOptionalBuffer(data[3]);
      } else if (data.buffer !== undefined) {
        fields.buffer = t.deserializeOptionalBuffer(data.buffer);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 3:
            fields.buffer = t.deserializeOptionalBuffer(data[i]);
            break;
        }
      }
    }
    return c.PlacerComponent.create(fields);
  }
}
export class QuestGiverSerde {
  static serialize(component: c.ReadonlyQuestGiver) {
    const data = [];
    if (component.concurrent_quests !== null) {
      data[1 - 1] = component.concurrent_quests;
    }
    if (component.concurrent_quest_dialog !== null) {
      data[2 - 1] = component.concurrent_quest_dialog;
    }
    return data;
  }

  static deserialize(data: any): c.QuestGiver {
    const fields: Partial<c.QuestGiver> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.concurrent_quests = t.deserializeOptionalI32(data[1]);
      } else if (data.concurrent_quests !== undefined) {
        fields.concurrent_quests = t.deserializeOptionalI32(
          data.concurrent_quests
        );
      }
      if (data[2] !== undefined) {
        fields.concurrent_quest_dialog = t.deserializeOptionalString(data[2]);
      } else if (data.concurrent_quest_dialog !== undefined) {
        fields.concurrent_quest_dialog = t.deserializeOptionalString(
          data.concurrent_quest_dialog
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.concurrent_quests = t.deserializeOptionalI32(data[i]);
            break;
          case 2:
            fields.concurrent_quest_dialog = t.deserializeOptionalString(
              data[i]
            );
            break;
        }
      }
    }
    return c.QuestGiver.create(fields);
  }
}
export class DefaultDialogSerde {
  static serialize(component: c.ReadonlyDefaultDialog) {
    const data = [];
    if (component.text !== null) {
      data[1 - 1] = component.text;
    }
    if (component.modified_at !== null) {
      data[2 - 1] = component.modified_at;
    }
    if (component.modified_by !== null) {
      data[3 - 1] = t.serializeOptionalBiomesId(component.modified_by);
    }
    return data;
  }

  static deserialize(data: any): c.DefaultDialog {
    const fields: Partial<c.DefaultDialog> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.text = t.deserializeString(data[1]);
      } else if (data.text !== undefined) {
        fields.text = t.deserializeString(data.text);
      }
      if (data[2] !== undefined) {
        fields.modified_at = t.deserializeOptionalF64(data[2]);
      } else if (data.modified_at !== undefined) {
        fields.modified_at = t.deserializeOptionalF64(data.modified_at);
      }
      if (data[3] !== undefined) {
        fields.modified_by = t.deserializeOptionalBiomesId(data[3]);
      } else if (data.modified_by !== undefined) {
        fields.modified_by = t.deserializeOptionalBiomesId(data.modified_by);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.text = t.deserializeString(data[i]);
            break;
          case 2:
            fields.modified_at = t.deserializeOptionalF64(data[i]);
            break;
          case 3:
            fields.modified_by = t.deserializeOptionalBiomesId(data[i]);
            break;
        }
      }
    }
    return c.DefaultDialog.create(fields);
  }
}
export class UnmuckSerde {
  static serialize(component: c.ReadonlyUnmuck) {
    const data = [];
    if (component.volume !== null) {
      data[2 - 1] = t.serializeVolume(component.volume);
    }
    if (component.snapToGrid !== null) {
      data[3 - 1] = component.snapToGrid;
    }
    return data;
  }

  static deserialize(data: any): c.Unmuck {
    const fields: Partial<c.Unmuck> = {};
    if (!Array.isArray(data)) {
      if (data[2] !== undefined) {
        fields.volume = t.deserializeVolume(data[2]);
      } else if (data.volume !== undefined) {
        fields.volume = t.deserializeVolume(data.volume);
      }
      if (data[3] !== undefined) {
        fields.snapToGrid = t.deserializeOptionalU32(data[3]);
      } else if (data.snapToGrid !== undefined) {
        fields.snapToGrid = t.deserializeOptionalU32(data.snapToGrid);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 2:
            fields.volume = t.deserializeVolume(data[i]);
            break;
          case 3:
            fields.snapToGrid = t.deserializeOptionalU32(data[i]);
            break;
        }
      }
    }
    return c.Unmuck.create(fields);
  }
}
export class RobotComponentSerde {
  static serialize(component: c.ReadonlyRobotComponent) {
    const data = [];
    if (component.trigger_at !== null) {
      data[1 - 1] = component.trigger_at;
    }
    if (component.internal_battery_charge !== null) {
      data[2 - 1] = component.internal_battery_charge;
    }
    if (component.internal_battery_capacity !== null) {
      data[3 - 1] = component.internal_battery_capacity;
    }
    if (component.last_update !== null) {
      data[4 - 1] = component.last_update;
    }
    return data;
  }

  static deserialize(data: any): c.RobotComponent {
    const fields: Partial<c.RobotComponent> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.trigger_at = t.deserializeOptionalF64(data[1]);
      } else if (data.trigger_at !== undefined) {
        fields.trigger_at = t.deserializeOptionalF64(data.trigger_at);
      }
      if (data[2] !== undefined) {
        fields.internal_battery_charge = t.deserializeOptionalF64(data[2]);
      } else if (data.internal_battery_charge !== undefined) {
        fields.internal_battery_charge = t.deserializeOptionalF64(
          data.internal_battery_charge
        );
      }
      if (data[3] !== undefined) {
        fields.internal_battery_capacity = t.deserializeOptionalF64(data[3]);
      } else if (data.internal_battery_capacity !== undefined) {
        fields.internal_battery_capacity = t.deserializeOptionalF64(
          data.internal_battery_capacity
        );
      }
      if (data[4] !== undefined) {
        fields.last_update = t.deserializeOptionalF64(data[4]);
      } else if (data.last_update !== undefined) {
        fields.last_update = t.deserializeOptionalF64(data.last_update);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.trigger_at = t.deserializeOptionalF64(data[i]);
            break;
          case 2:
            fields.internal_battery_charge = t.deserializeOptionalF64(data[i]);
            break;
          case 3:
            fields.internal_battery_capacity = t.deserializeOptionalF64(
              data[i]
            );
            break;
          case 4:
            fields.last_update = t.deserializeOptionalF64(data[i]);
            break;
        }
      }
    }
    return c.RobotComponent.create(fields);
  }
}
export class AdminEntitySerde {
  static serialize(_: any) {
    return [];
  }

  static deserialize(data: any): c.AdminEntity {
    const fields: Partial<c.AdminEntity> = {};
    if (!Array.isArray(data)) {
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
        }
      }
    }
    return c.AdminEntity.create(fields);
  }
}
export class ProtectionSerde {
  static serialize(component: c.ReadonlyProtection) {
    const data = [];
    if (component.timestamp !== null) {
      data[1 - 1] = component.timestamp;
    }
    return data;
  }

  static deserialize(data: any): c.Protection {
    const fields: Partial<c.Protection> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.timestamp = t.deserializeOptionalF64(data[1]);
      } else if (data.timestamp !== undefined) {
        fields.timestamp = t.deserializeOptionalF64(data.timestamp);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.timestamp = t.deserializeOptionalF64(data[i]);
            break;
        }
      }
    }
    return c.Protection.create(fields);
  }
}
export class ProjectsProtectionSerde {
  static serialize(component: c.ReadonlyProjectsProtection) {
    const data = [];
    if (component.protectionChildId !== null) {
      data[1 - 1] = t.serializeOptionalBiomesId(component.protectionChildId);
    }
    if (component.restorationChildId !== null) {
      data[5 - 1] = t.serializeOptionalBiomesId(component.restorationChildId);
    }
    if (component.size !== null) {
      data[2 - 1] = component.size;
    }
    if (component.protection !== null) {
      data[3 - 1] = t.serializeOptionalProtectionParams(component.protection);
    }
    if (component.restoration !== null) {
      data[4 - 1] = t.serializeOptionalRestorationParams(component.restoration);
    }
    if (component.timestamp !== null) {
      data[6 - 1] = component.timestamp;
    }
    if (component.snapToGrid !== null) {
      data[7 - 1] = component.snapToGrid;
    }
    return data;
  }

  static deserialize(data: any): c.ProjectsProtection {
    const fields: Partial<c.ProjectsProtection> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.protectionChildId = t.deserializeOptionalBiomesId(data[1]);
      } else if (data.protectionChildId !== undefined) {
        fields.protectionChildId = t.deserializeOptionalBiomesId(
          data.protectionChildId
        );
      }
      if (data[5] !== undefined) {
        fields.restorationChildId = t.deserializeOptionalBiomesId(data[5]);
      } else if (data.restorationChildId !== undefined) {
        fields.restorationChildId = t.deserializeOptionalBiomesId(
          data.restorationChildId
        );
      }
      if (data[2] !== undefined) {
        fields.size = t.deserializeVec3f(data[2]);
      } else if (data.size !== undefined) {
        fields.size = t.deserializeVec3f(data.size);
      }
      if (data[3] !== undefined) {
        fields.protection = t.deserializeOptionalProtectionParams(data[3]);
      } else if (data.protection !== undefined) {
        fields.protection = t.deserializeOptionalProtectionParams(
          data.protection
        );
      }
      if (data[4] !== undefined) {
        fields.restoration = t.deserializeOptionalRestorationParams(data[4]);
      } else if (data.restoration !== undefined) {
        fields.restoration = t.deserializeOptionalRestorationParams(
          data.restoration
        );
      }
      if (data[6] !== undefined) {
        fields.timestamp = t.deserializeOptionalF64(data[6]);
      } else if (data.timestamp !== undefined) {
        fields.timestamp = t.deserializeOptionalF64(data.timestamp);
      }
      if (data[7] !== undefined) {
        fields.snapToGrid = t.deserializeOptionalU32(data[7]);
      } else if (data.snapToGrid !== undefined) {
        fields.snapToGrid = t.deserializeOptionalU32(data.snapToGrid);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.protectionChildId = t.deserializeOptionalBiomesId(data[i]);
            break;
          case 5:
            fields.restorationChildId = t.deserializeOptionalBiomesId(data[i]);
            break;
          case 2:
            fields.size = t.deserializeVec3f(data[i]);
            break;
          case 3:
            fields.protection = t.deserializeOptionalProtectionParams(data[i]);
            break;
          case 4:
            fields.restoration = t.deserializeOptionalRestorationParams(
              data[i]
            );
            break;
          case 6:
            fields.timestamp = t.deserializeOptionalF64(data[i]);
            break;
          case 7:
            fields.snapToGrid = t.deserializeOptionalU32(data[i]);
            break;
        }
      }
    }
    return c.ProjectsProtection.create(fields);
  }
}
export class DeletesWithSerde {
  static serialize(component: c.ReadonlyDeletesWith) {
    const data = [];
    if (component.id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.id);
    }
    return data;
  }

  static deserialize(data: any): c.DeletesWith {
    const fields: Partial<c.DeletesWith> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.id = t.deserializeBiomesId(data[1]);
      } else if (data.id !== undefined) {
        fields.id = t.deserializeBiomesId(data.id);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.id = t.deserializeBiomesId(data[i]);
            break;
        }
      }
    }
    return c.DeletesWith.create(fields);
  }
}
export class ItemBuyerSerde {
  static serialize(component: c.ReadonlyItemBuyer) {
    const data = [];
    if (component.attribute_ids !== null) {
      data[2 - 1] = t.serializeBiomesIdList(component.attribute_ids);
    }
    if (component.buy_description !== null) {
      data[3 - 1] = component.buy_description;
    }
    return data;
  }

  static deserialize(data: any): c.ItemBuyer {
    const fields: Partial<c.ItemBuyer> = {};
    if (!Array.isArray(data)) {
      if (data[2] !== undefined) {
        fields.attribute_ids = t.deserializeBiomesIdList(data[2]);
      } else if (data.attribute_ids !== undefined) {
        fields.attribute_ids = t.deserializeBiomesIdList(data.attribute_ids);
      }
      if (data[3] !== undefined) {
        fields.buy_description = t.deserializeOptionalString(data[3]);
      } else if (data.buy_description !== undefined) {
        fields.buy_description = t.deserializeOptionalString(
          data.buy_description
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 2:
            fields.attribute_ids = t.deserializeBiomesIdList(data[i]);
            break;
          case 3:
            fields.buy_description = t.deserializeOptionalString(data[i]);
            break;
        }
      }
    }
    return c.ItemBuyer.create(fields);
  }
}
export class InspectionTweaksSerde {
  static serialize(component: c.ReadonlyInspectionTweaks) {
    const data = [];
    if (component.hidden !== null) {
      data[1 - 1] = component.hidden;
    }
    return data;
  }

  static deserialize(data: any): c.InspectionTweaks {
    const fields: Partial<c.InspectionTweaks> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.hidden = t.deserializeOptionalBool(data[1]);
      } else if (data.hidden !== undefined) {
        fields.hidden = t.deserializeOptionalBool(data.hidden);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.hidden = t.deserializeOptionalBool(data[i]);
            break;
        }
      }
    }
    return c.InspectionTweaks.create(fields);
  }
}
export class ProfilePicSerde {
  static serialize(component: c.ReadonlyProfilePic) {
    const data = [];
    if (component.cloud_bundle !== null) {
      data[1 - 1] = component.cloud_bundle;
    }
    if (component.hash !== null) {
      data[2 - 1] = component.hash;
    }
    return data;
  }

  static deserialize(data: any): c.ProfilePic {
    const fields: Partial<c.ProfilePic> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.cloud_bundle = t.deserializeBucketedImageCloudBundle(data[1]);
      } else if (data.cloud_bundle !== undefined) {
        fields.cloud_bundle = t.deserializeBucketedImageCloudBundle(
          data.cloud_bundle
        );
      }
      if (data[2] !== undefined) {
        fields.hash = t.deserializeOptionalString(data[2]);
      } else if (data.hash !== undefined) {
        fields.hash = t.deserializeOptionalString(data.hash);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.cloud_bundle = t.deserializeBucketedImageCloudBundle(
              data[i]
            );
            break;
          case 2:
            fields.hash = t.deserializeOptionalString(data[i]);
            break;
        }
      }
    }
    return c.ProfilePic.create(fields);
  }
}
export class EntityDescriptionSerde {
  static serialize(component: c.ReadonlyEntityDescription) {
    const data = [];
    if (component.text !== null) {
      data[1 - 1] = component.text;
    }
    return data;
  }

  static deserialize(data: any): c.EntityDescription {
    const fields: Partial<c.EntityDescription> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.text = t.deserializeString(data[1]);
      } else if (data.text !== undefined) {
        fields.text = t.deserializeString(data.text);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.text = t.deserializeString(data[i]);
            break;
        }
      }
    }
    return c.EntityDescription.create(fields);
  }
}
export class LandmarkSerde {
  static serialize(component: c.ReadonlyLandmark) {
    const data = [];
    if (component.override_name !== null) {
      data[1 - 1] = component.override_name;
    }
    if (component.importance !== null) {
      data[2 - 1] = component.importance;
    }
    return data;
  }

  static deserialize(data: any): c.Landmark {
    const fields: Partial<c.Landmark> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.override_name = t.deserializeOptionalString(data[1]);
      } else if (data.override_name !== undefined) {
        fields.override_name = t.deserializeOptionalString(data.override_name);
      }
      if (data[2] !== undefined) {
        fields.importance = t.deserializeOptionalU32(data[2]);
      } else if (data.importance !== undefined) {
        fields.importance = t.deserializeOptionalU32(data.importance);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.override_name = t.deserializeOptionalString(data[i]);
            break;
          case 2:
            fields.importance = t.deserializeOptionalU32(data[i]);
            break;
        }
      }
    }
    return c.Landmark.create(fields);
  }
}
export class CollideableSerde {
  static serialize(_: any) {
    return [];
  }

  static deserialize(data: any): c.Collideable {
    const fields: Partial<c.Collideable> = {};
    if (!Array.isArray(data)) {
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
        }
      }
    }
    return c.Collideable.create(fields);
  }
}
export class RestorationSerde {
  static serialize(component: c.ReadonlyRestoration) {
    const data = [];
    if (component.timestamp !== null) {
      data[1 - 1] = component.timestamp;
    }
    if (component.restore_delay_s !== null) {
      data[2 - 1] = component.restore_delay_s;
    }
    return data;
  }

  static deserialize(data: any): c.Restoration {
    const fields: Partial<c.Restoration> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.timestamp = t.deserializeOptionalF64(data[1]);
      } else if (data.timestamp !== undefined) {
        fields.timestamp = t.deserializeOptionalF64(data.timestamp);
      }
      if (data[2] !== undefined) {
        fields.restore_delay_s = t.deserializeF64(data[2]);
      } else if (data.restore_delay_s !== undefined) {
        fields.restore_delay_s = t.deserializeF64(data.restore_delay_s);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.timestamp = t.deserializeOptionalF64(data[i]);
            break;
          case 2:
            fields.restore_delay_s = t.deserializeF64(data[i]);
            break;
        }
      }
    }
    return c.Restoration.create(fields);
  }
}
export class TerrainRestorationDiffSerde {
  static serialize(component: c.ReadonlyTerrainRestorationDiff) {
    const data = [];
    if (component.restores !== null) {
      data[6 - 1] = component.restores;
    }
    return data;
  }

  static deserialize(data: any): c.TerrainRestorationDiff {
    const fields: Partial<c.TerrainRestorationDiff> = {};
    if (!Array.isArray(data)) {
      if (data[6] !== undefined) {
        fields.restores = t.deserializeTerrainRestorationEntryList(data[6]);
      } else if (data.restores !== undefined) {
        fields.restores = t.deserializeTerrainRestorationEntryList(
          data.restores
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 6:
            fields.restores = t.deserializeTerrainRestorationEntryList(data[i]);
            break;
        }
      }
    }
    return c.TerrainRestorationDiff.create(fields);
  }
}
export class TeamSerde {
  static serialize(component: c.ReadonlyTeam) {
    const data = [];
    if (component.members !== null) {
      data[1 - 1] = t.serializeTeamMembers(component.members);
    }
    if (component.pending_invites !== null) {
      data[2 - 1] = t.serializeTeamPendingInvites(component.pending_invites);
    }
    if (component.icon !== null) {
      data[3 - 1] = component.icon;
    }
    if (component.color !== null) {
      data[4 - 1] = component.color;
    }
    if (component.hero_photo_id !== null) {
      data[5 - 1] = t.serializeOptionalBiomesId(component.hero_photo_id);
    }
    if (component.pending_requests !== null) {
      data[6 - 1] = t.serializeTeamPendingRequests(component.pending_requests);
    }
    return data;
  }

  static deserialize(data: any): c.Team {
    const fields: Partial<c.Team> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.members = t.deserializeTeamMembers(data[1]);
      } else if (data.members !== undefined) {
        fields.members = t.deserializeTeamMembers(data.members);
      }
      if (data[2] !== undefined) {
        fields.pending_invites = t.deserializeTeamPendingInvites(data[2]);
      } else if (data.pending_invites !== undefined) {
        fields.pending_invites = t.deserializeTeamPendingInvites(
          data.pending_invites
        );
      }
      if (data[3] !== undefined) {
        fields.icon = t.deserializeOptionalString(data[3]);
      } else if (data.icon !== undefined) {
        fields.icon = t.deserializeOptionalString(data.icon);
      }
      if (data[4] !== undefined) {
        fields.color = t.deserializeOptionalI32(data[4]);
      } else if (data.color !== undefined) {
        fields.color = t.deserializeOptionalI32(data.color);
      }
      if (data[5] !== undefined) {
        fields.hero_photo_id = t.deserializeOptionalBiomesId(data[5]);
      } else if (data.hero_photo_id !== undefined) {
        fields.hero_photo_id = t.deserializeOptionalBiomesId(
          data.hero_photo_id
        );
      }
      if (data[6] !== undefined) {
        fields.pending_requests = t.deserializeTeamPendingRequests(data[6]);
      } else if (data.pending_requests !== undefined) {
        fields.pending_requests = t.deserializeTeamPendingRequests(
          data.pending_requests
        );
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.members = t.deserializeTeamMembers(data[i]);
            break;
          case 2:
            fields.pending_invites = t.deserializeTeamPendingInvites(data[i]);
            break;
          case 3:
            fields.icon = t.deserializeOptionalString(data[i]);
            break;
          case 4:
            fields.color = t.deserializeOptionalI32(data[i]);
            break;
          case 5:
            fields.hero_photo_id = t.deserializeOptionalBiomesId(data[i]);
            break;
          case 6:
            fields.pending_requests = t.deserializeTeamPendingRequests(data[i]);
            break;
        }
      }
    }
    return c.Team.create(fields);
  }
}
export class PlayerCurrentTeamSerde {
  static serialize(component: c.ReadonlyPlayerCurrentTeam) {
    const data = [];
    if (component.team_id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.team_id);
    }
    return data;
  }

  static deserialize(data: any): c.PlayerCurrentTeam {
    const fields: Partial<c.PlayerCurrentTeam> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.team_id = t.deserializeBiomesId(data[1]);
      } else if (data.team_id !== undefined) {
        fields.team_id = t.deserializeBiomesId(data.team_id);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.team_id = t.deserializeBiomesId(data[i]);
            break;
        }
      }
    }
    return c.PlayerCurrentTeam.create(fields);
  }
}
export class UserRolesSerde {
  static serialize(component: c.ReadonlyUserRoles) {
    const data = [];
    if (component.roles !== null) {
      data[1 - 1] = t.serializeUserRoleSet(component.roles);
    }
    return data;
  }

  static deserialize(data: any): c.UserRoles {
    const fields: Partial<c.UserRoles> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.roles = t.deserializeUserRoleSet(data[1]);
      } else if (data.roles !== undefined) {
        fields.roles = t.deserializeUserRoleSet(data.roles);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.roles = t.deserializeUserRoleSet(data[i]);
            break;
        }
      }
    }
    return c.UserRoles.create(fields);
  }
}
export class RestoresToSerde {
  static serialize(component: c.ReadonlyRestoresTo) {
    const data = [];
    if (component.trigger_at !== null) {
      data[1 - 1] = component.trigger_at;
    }
    if (component.restore_to_state !== null) {
      data[2 - 1] = component.restore_to_state;
    }
    if (component.expire !== null) {
      data[3 - 1] = component.expire;
    }
    return data;
  }

  static deserialize(data: any): c.RestoresTo {
    const fields: Partial<c.RestoresTo> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.trigger_at = t.deserializeF64(data[1]);
      } else if (data.trigger_at !== undefined) {
        fields.trigger_at = t.deserializeF64(data.trigger_at);
      }
      if (data[2] !== undefined) {
        fields.restore_to_state = t.deserializeEntityRestoreToState(data[2]);
      } else if (data.restore_to_state !== undefined) {
        fields.restore_to_state = t.deserializeEntityRestoreToState(
          data.restore_to_state
        );
      }
      if (data[3] !== undefined) {
        fields.expire = t.deserializeOptionalBool(data[3]);
      } else if (data.expire !== undefined) {
        fields.expire = t.deserializeOptionalBool(data.expire);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.trigger_at = t.deserializeF64(data[i]);
            break;
          case 2:
            fields.restore_to_state = t.deserializeEntityRestoreToState(
              data[i]
            );
            break;
          case 3:
            fields.expire = t.deserializeOptionalBool(data[i]);
            break;
        }
      }
    }
    return c.RestoresTo.create(fields);
  }
}
export class TradeSerde {
  static serialize(component: c.ReadonlyTrade) {
    const data = [];
    if (component.trader1 !== null) {
      data[1 - 1] = t.serializeTrader(component.trader1);
    }
    if (component.trader2 !== null) {
      data[2 - 1] = t.serializeTrader(component.trader2);
    }
    if (component.trigger_at !== null) {
      data[3 - 1] = component.trigger_at;
    }
    return data;
  }

  static deserialize(data: any): c.Trade {
    const fields: Partial<c.Trade> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.trader1 = t.deserializeTrader(data[1]);
      } else if (data.trader1 !== undefined) {
        fields.trader1 = t.deserializeTrader(data.trader1);
      }
      if (data[2] !== undefined) {
        fields.trader2 = t.deserializeTrader(data[2]);
      } else if (data.trader2 !== undefined) {
        fields.trader2 = t.deserializeTrader(data.trader2);
      }
      if (data[3] !== undefined) {
        fields.trigger_at = t.deserializeOptionalF64(data[3]);
      } else if (data.trigger_at !== undefined) {
        fields.trigger_at = t.deserializeOptionalF64(data.trigger_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.trader1 = t.deserializeTrader(data[i]);
            break;
          case 2:
            fields.trader2 = t.deserializeTrader(data[i]);
            break;
          case 3:
            fields.trigger_at = t.deserializeOptionalF64(data[i]);
            break;
        }
      }
    }
    return c.Trade.create(fields);
  }
}
export class ActiveTradesSerde {
  static serialize(component: c.ReadonlyActiveTrades) {
    const data = [];
    if (component.trades !== null) {
      data[1 - 1] = t.serializeTradeSpecList(component.trades);
    }
    return data;
  }

  static deserialize(data: any): c.ActiveTrades {
    const fields: Partial<c.ActiveTrades> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.trades = t.deserializeTradeSpecList(data[1]);
      } else if (data.trades !== undefined) {
        fields.trades = t.deserializeTradeSpecList(data.trades);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.trades = t.deserializeTradeSpecList(data[i]);
            break;
        }
      }
    }
    return c.ActiveTrades.create(fields);
  }
}
export class PlacedBySerde {
  static serialize(component: c.ReadonlyPlacedBy) {
    const data = [];
    if (component.id !== null) {
      data[1 - 1] = t.serializeBiomesId(component.id);
    }
    if (component.placed_at !== null) {
      data[2 - 1] = component.placed_at;
    }
    return data;
  }

  static deserialize(data: any): c.PlacedBy {
    const fields: Partial<c.PlacedBy> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.id = t.deserializeBiomesId(data[1]);
      } else if (data.id !== undefined) {
        fields.id = t.deserializeBiomesId(data.id);
      }
      if (data[2] !== undefined) {
        fields.placed_at = t.deserializeF64(data[2]);
      } else if (data.placed_at !== undefined) {
        fields.placed_at = t.deserializeF64(data.placed_at);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.id = t.deserializeBiomesId(data[i]);
            break;
          case 2:
            fields.placed_at = t.deserializeF64(data[i]);
            break;
        }
      }
    }
    return c.PlacedBy.create(fields);
  }
}
export class TextSignSerde {
  static serialize(component: c.ReadonlyTextSign) {
    const data = [];
    if (component.text !== null) {
      data[1 - 1] = component.text;
    }
    return data;
  }

  static deserialize(data: any): c.TextSign {
    const fields: Partial<c.TextSign> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.text = t.deserializeStrings(data[1]);
      } else if (data.text !== undefined) {
        fields.text = t.deserializeStrings(data.text);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.text = t.deserializeStrings(data[i]);
            break;
        }
      }
    }
    return c.TextSign.create(fields);
  }
}
export class IrradianceSerde {
  static serialize(component: c.ReadonlyIrradiance) {
    const data = [];
    if (component.intensity !== null) {
      data[1 - 1] = component.intensity;
    }
    if (component.color !== null) {
      data[2 - 1] = component.color;
    }
    return data;
  }

  static deserialize(data: any): c.Irradiance {
    const fields: Partial<c.Irradiance> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.intensity = t.deserializeU8(data[1]);
      } else if (data.intensity !== undefined) {
        fields.intensity = t.deserializeU8(data.intensity);
      }
      if (data[2] !== undefined) {
        fields.color = t.deserializeVec3f(data[2]);
      } else if (data.color !== undefined) {
        fields.color = t.deserializeVec3f(data.color);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.intensity = t.deserializeU8(data[i]);
            break;
          case 2:
            fields.color = t.deserializeVec3f(data[i]);
            break;
        }
      }
    }
    return c.Irradiance.create(fields);
  }
}
export class LockedInPlaceSerde {
  static serialize(_: any) {
    return [];
  }

  static deserialize(data: any): c.LockedInPlace {
    const fields: Partial<c.LockedInPlace> = {};
    if (!Array.isArray(data)) {
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
        }
      }
    }
    return c.LockedInPlace.create(fields);
  }
}
export class DeathInfoSerde {
  static serialize(component: c.ReadonlyDeathInfo) {
    const data = [];
    if (component.last_death_pos !== null) {
      data[1 - 1] = component.last_death_pos;
    }
    if (component.last_death_time !== null) {
      data[2 - 1] = component.last_death_time;
    }
    return data;
  }

  static deserialize(data: any): c.DeathInfo {
    const fields: Partial<c.DeathInfo> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.last_death_pos = t.deserializeOptionalVec3f(data[1]);
      } else if (data.last_death_pos !== undefined) {
        fields.last_death_pos = t.deserializeOptionalVec3f(data.last_death_pos);
      }
      if (data[2] !== undefined) {
        fields.last_death_time = t.deserializeOptionalF64(data[2]);
      } else if (data.last_death_time !== undefined) {
        fields.last_death_time = t.deserializeOptionalF64(data.last_death_time);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.last_death_pos = t.deserializeOptionalVec3f(data[i]);
            break;
          case 2:
            fields.last_death_time = t.deserializeOptionalF64(data[i]);
            break;
        }
      }
    }
    return c.DeathInfo.create(fields);
  }
}
export class SyntheticStatsSerde {
  static serialize(component: c.ReadonlySyntheticStats) {
    const data = [];
    if (component.online_players !== null) {
      data[1 - 1] = component.online_players;
    }
    return data;
  }

  static deserialize(data: any): c.SyntheticStats {
    const fields: Partial<c.SyntheticStats> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.online_players = t.deserializeU32(data[1]);
      } else if (data.online_players !== undefined) {
        fields.online_players = t.deserializeU32(data.online_players);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.online_players = t.deserializeU32(data[i]);
            break;
        }
      }
    }
    return c.SyntheticStats.create(fields);
  }
}
export class IdleSerde {
  static serialize(_: any) {
    return [];
  }

  static deserialize(data: any): c.Idle {
    const fields: Partial<c.Idle> = {};
    if (!Array.isArray(data)) {
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
        }
      }
    }
    return c.Idle.create(fields);
  }
}
export class VoiceSerde {
  static serialize(component: c.ReadonlyVoice) {
    const data = [];
    if (component.voice !== null) {
      data[1 - 1] = component.voice;
    }
    return data;
  }

  static deserialize(data: any): c.Voice {
    const fields: Partial<c.Voice> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.voice = t.deserializeString(data[1]);
      } else if (data.voice !== undefined) {
        fields.voice = t.deserializeString(data.voice);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.voice = t.deserializeString(data[i]);
            break;
        }
      }
    }
    return c.Voice.create(fields);
  }
}
export class GiftGiverSerde {
  static serialize(component: c.ReadonlyGiftGiver) {
    const data = [];
    if (component.last_gift_time !== null) {
      data[1 - 1] = component.last_gift_time;
    }
    if (component.gift_targets !== null) {
      data[2 - 1] = t.serializeBiomesIdList(component.gift_targets);
    }
    return data;
  }

  static deserialize(data: any): c.GiftGiver {
    const fields: Partial<c.GiftGiver> = {};
    if (!Array.isArray(data)) {
      if (data[1] !== undefined) {
        fields.last_gift_time = t.deserializeOptionalF64(data[1]);
      } else if (data.last_gift_time !== undefined) {
        fields.last_gift_time = t.deserializeOptionalF64(data.last_gift_time);
      }
      if (data[2] !== undefined) {
        fields.gift_targets = t.deserializeBiomesIdList(data[2]);
      } else if (data.gift_targets !== undefined) {
        fields.gift_targets = t.deserializeBiomesIdList(data.gift_targets);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
          continue;
        }
        switch (i + 1) {
          case 1:
            fields.last_gift_time = t.deserializeOptionalF64(data[i]);
            break;
          case 2:
            fields.gift_targets = t.deserializeBiomesIdList(data[i]);
            break;
        }
      }
    }
    return c.GiftGiver.create(fields);
  }
}

function badEntity(message: string, data: unknown): never {
  log.warn(`Bad entity: ${message}`, {
    data: process.env.IS_SERVER ? data : undefined,
  });
  throw new Error(`Bad entity: ${message}`);
}

const COMPONENT_ID_TO_DESERIALIZE = {
  57: IcedSerde.deserialize,
  31: RemoteConnectionSerde.deserialize,
  54: PositionSerde.deserialize,
  55: OrientationSerde.deserialize,
  32: RigidBodySerde.deserialize,
  110: SizeSerde.deserialize,
  33: BoxSerde.deserialize,
  34: ShardSeedSerde.deserialize,
  35: ShardDiffSerde.deserialize,
  60: ShardShapesSerde.deserialize,
  76: ShardSkyOcclusionSerde.deserialize,
  80: ShardIrradianceSerde.deserialize,
  82: ShardWaterSerde.deserialize,
  93: ShardOccupancySerde.deserialize,
  111: ShardDyeSerde.deserialize,
  112: ShardMoistureSerde.deserialize,
  113: ShardGrowthSerde.deserialize,
  120: ShardPlacerSerde.deserialize,
  124: ShardMuckSerde.deserialize,
  37: LabelSerde.deserialize,
  51: GrabBagSerde.deserialize,
  52: AcquisitionSerde.deserialize,
  53: LooseItemSerde.deserialize,
  41: InventorySerde.deserialize,
  79: ContainerInventorySerde.deserialize,
  86: PricedContainerInventorySerde.deserialize,
  59: SelectedItemSerde.deserialize,
  49: WearingSerde.deserialize,
  43: EmoteSerde.deserialize,
  56: AppearanceComponentSerde.deserialize,
  45: GroupComponentSerde.deserialize,
  46: ChallengesSerde.deserialize,
  48: RecipeBookSerde.deserialize,
  50: ExpiresSerde.deserialize,
  58: IcingSerde.deserialize,
  61: WarpableSerde.deserialize,
  63: PlayerStatusSerde.deserialize,
  64: PlayerBehaviorSerde.deserialize,
  65: WorldMetadataSerde.deserialize,
  66: NpcMetadataSerde.deserialize,
  67: NpcStateSerde.deserialize,
  68: GroupPreviewReferenceSerde.deserialize,
  70: AclComponentSerde.deserialize,
  71: DeedComponentSerde.deserialize,
  72: GroupPreviewComponentSerde.deserialize,
  87: BlueprintComponentSerde.deserialize,
  74: CraftingStationComponentSerde.deserialize,
  75: HealthSerde.deserialize,
  101: BuffsComponentSerde.deserialize,
  77: GremlinSerde.deserialize,
  78: PlaceableComponentSerde.deserialize,
  83: GroupedEntitiesSerde.deserialize,
  95: InGroupSerde.deserialize,
  84: PictureFrameContentsSerde.deserialize,
  88: TriggerStateSerde.deserialize,
  91: LifetimeStatsSerde.deserialize,
  97: OccupancyComponentSerde.deserialize,
  92: VideoComponentSerde.deserialize,
  98: PlayerSessionSerde.deserialize,
  99: PresetAppliedSerde.deserialize,
  100: PresetPrototypeSerde.deserialize,
  102: FarmingPlantComponentSerde.deserialize,
  103: ShardFarmingSerde.deserialize,
  104: CreatedBySerde.deserialize,
  105: MinigameComponentSerde.deserialize,
  106: MinigameInstanceSerde.deserialize,
  107: PlayingMinigameSerde.deserialize,
  108: MinigameElementSerde.deserialize,
  109: ActiveTraySerde.deserialize,
  115: StashedSerde.deserialize,
  117: MinigameInstanceTickInfoSerde.deserialize,
  118: WarpingToSerde.deserialize,
  119: MinigameInstanceExpireSerde.deserialize,
  121: PlacerComponentSerde.deserialize,
  122: QuestGiverSerde.deserialize,
  123: DefaultDialogSerde.deserialize,
  125: UnmuckSerde.deserialize,
  126: RobotComponentSerde.deserialize,
  140: AdminEntitySerde.deserialize,
  127: ProtectionSerde.deserialize,
  128: ProjectsProtectionSerde.deserialize,
  129: DeletesWithSerde.deserialize,
  130: ItemBuyerSerde.deserialize,
  131: InspectionTweaksSerde.deserialize,
  132: ProfilePicSerde.deserialize,
  133: EntityDescriptionSerde.deserialize,
  134: LandmarkSerde.deserialize,
  135: CollideableSerde.deserialize,
  136: RestorationSerde.deserialize,
  137: TerrainRestorationDiffSerde.deserialize,
  138: TeamSerde.deserialize,
  139: PlayerCurrentTeamSerde.deserialize,
  141: UserRolesSerde.deserialize,
  142: RestoresToSerde.deserialize,
  143: TradeSerde.deserialize,
  144: ActiveTradesSerde.deserialize,
  145: PlacedBySerde.deserialize,
  146: TextSignSerde.deserialize,
  147: IrradianceSerde.deserialize,
  148: LockedInPlaceSerde.deserialize,
  149: DeathInfoSerde.deserialize,
  150: SyntheticStatsSerde.deserialize,
  151: IdleSerde.deserialize,
  152: VoiceSerde.deserialize,
  153: GiftGiverSerde.deserialize,
};

const COMPONENT_ID_TO_PROP_NAME: { [key: number]: keyof e.Entity } = {
  57: "iced",
  31: "remote_connection",
  54: "position",
  55: "orientation",
  32: "rigid_body",
  110: "size",
  33: "box",
  34: "shard_seed",
  35: "shard_diff",
  60: "shard_shapes",
  76: "shard_sky_occlusion",
  80: "shard_irradiance",
  82: "shard_water",
  93: "shard_occupancy",
  111: "shard_dye",
  112: "shard_moisture",
  113: "shard_growth",
  120: "shard_placer",
  124: "shard_muck",
  37: "label",
  51: "grab_bag",
  52: "acquisition",
  53: "loose_item",
  41: "inventory",
  79: "container_inventory",
  86: "priced_container_inventory",
  59: "selected_item",
  49: "wearing",
  43: "emote",
  56: "appearance_component",
  45: "group_component",
  46: "challenges",
  48: "recipe_book",
  50: "expires",
  58: "icing",
  61: "warpable",
  63: "player_status",
  64: "player_behavior",
  65: "world_metadata",
  66: "npc_metadata",
  67: "npc_state",
  68: "group_preview_reference",
  70: "acl_component",
  71: "deed_component",
  72: "group_preview_component",
  87: "blueprint_component",
  74: "crafting_station_component",
  75: "health",
  101: "buffs_component",
  77: "gremlin",
  78: "placeable_component",
  83: "grouped_entities",
  95: "in_group",
  84: "picture_frame_contents",
  88: "trigger_state",
  91: "lifetime_stats",
  97: "occupancy_component",
  92: "video_component",
  98: "player_session",
  99: "preset_applied",
  100: "preset_prototype",
  102: "farming_plant_component",
  103: "shard_farming",
  104: "created_by",
  105: "minigame_component",
  106: "minigame_instance",
  107: "playing_minigame",
  108: "minigame_element",
  109: "active_tray",
  115: "stashed",
  117: "minigame_instance_tick_info",
  118: "warping_to",
  119: "minigame_instance_expire",
  121: "placer_component",
  122: "quest_giver",
  123: "default_dialog",
  125: "unmuck",
  126: "robot_component",
  140: "admin_entity",
  127: "protection",
  128: "projects_protection",
  129: "deletes_with",
  130: "item_buyer",
  131: "inspection_tweaks",
  132: "profile_pic",
  133: "entity_description",
  134: "landmark",
  135: "collideable",
  136: "restoration",
  137: "terrain_restoration_diff",
  138: "team",
  139: "player_current_team",
  141: "user_roles",
  142: "restores_to",
  143: "trade",
  144: "active_trades",
  145: "placed_by",
  146: "text_sign",
  147: "irradiance",
  148: "locked_in_place",
  149: "death_info",
  150: "synthetic_stats",
  151: "idle",
  152: "voice",
  153: "gift_giver",
};

export interface SerializeForClient {
  whoFor: "client";
  id: BiomesId;
}

export interface SerializeForServer {
  whoFor: "server";
}

export const SerializeForServer = {
  whoFor: "server",
} as const;

export type SerializeTarget = SerializeForClient | SerializeForServer;

export class EntitySerde {
  static serialize(
    target: SerializeTarget,
    entity?:
      | e.ReadonlyEntity
      | e.Entity
      | e.AsDelta<e.Entity>
      | e.AsDelta<e.ReadonlyEntity>,
    encodeDelta = false
  ) {
    if (!entity) {
      return undefined;
    }
    const data: any = [entity.id];
    if (entity.iced !== undefined) {
      if (entity.iced === null) {
        if (encodeDelta) {
          data.push(57, null);
        }
      } else {
        data.push(57, IcedSerde.serialize(entity.iced));
      }
    }
    if (entity.remote_connection !== undefined) {
      if (entity.remote_connection === null) {
        if (encodeDelta) {
          data.push(31, null);
        }
      } else {
        data.push(
          31,
          RemoteConnectionSerde.serialize(entity.remote_connection)
        );
      }
    }
    if (entity.position !== undefined) {
      if (entity.position === null) {
        if (encodeDelta) {
          data.push(54, null);
        }
      } else {
        data.push(54, PositionSerde.serialize(entity.position));
      }
    }
    if (entity.orientation !== undefined) {
      if (entity.orientation === null) {
        if (encodeDelta) {
          data.push(55, null);
        }
      } else {
        data.push(55, OrientationSerde.serialize(entity.orientation));
      }
    }
    if (entity.rigid_body !== undefined) {
      if (entity.rigid_body === null) {
        if (encodeDelta) {
          data.push(32, null);
        }
      } else {
        data.push(32, RigidBodySerde.serialize(entity.rigid_body));
      }
    }
    if (entity.size !== undefined) {
      if (entity.size === null) {
        if (encodeDelta) {
          data.push(110, null);
        }
      } else {
        data.push(110, SizeSerde.serialize(entity.size));
      }
    }
    if (entity.box !== undefined) {
      if (entity.box === null) {
        if (encodeDelta) {
          data.push(33, null);
        }
      } else {
        data.push(33, BoxSerde.serialize(entity.box));
      }
    }
    if (entity.shard_seed !== undefined) {
      if (entity.shard_seed === null) {
        if (encodeDelta) {
          data.push(34, null);
        }
      } else {
        data.push(34, ShardSeedSerde.serialize(entity.shard_seed));
      }
    }
    if (entity.shard_diff !== undefined) {
      if (entity.shard_diff === null) {
        if (encodeDelta) {
          data.push(35, null);
        }
      } else {
        data.push(35, ShardDiffSerde.serialize(entity.shard_diff));
      }
    }
    if (entity.shard_shapes !== undefined) {
      if (entity.shard_shapes === null) {
        if (encodeDelta) {
          data.push(60, null);
        }
      } else {
        data.push(60, ShardShapesSerde.serialize(entity.shard_shapes));
      }
    }
    if (entity.shard_sky_occlusion !== undefined) {
      if (entity.shard_sky_occlusion === null) {
        if (encodeDelta) {
          data.push(76, null);
        }
      } else {
        data.push(
          76,
          ShardSkyOcclusionSerde.serialize(entity.shard_sky_occlusion)
        );
      }
    }
    if (entity.shard_irradiance !== undefined) {
      if (entity.shard_irradiance === null) {
        if (encodeDelta) {
          data.push(80, null);
        }
      } else {
        data.push(80, ShardIrradianceSerde.serialize(entity.shard_irradiance));
      }
    }
    if (entity.shard_water !== undefined) {
      if (entity.shard_water === null) {
        if (encodeDelta) {
          data.push(82, null);
        }
      } else {
        data.push(82, ShardWaterSerde.serialize(entity.shard_water));
      }
    }
    if (entity.shard_occupancy !== undefined) {
      if (entity.shard_occupancy === null) {
        if (encodeDelta) {
          data.push(93, null);
        }
      } else {
        data.push(93, ShardOccupancySerde.serialize(entity.shard_occupancy));
      }
    }
    if (entity.shard_dye !== undefined) {
      if (entity.shard_dye === null) {
        if (encodeDelta) {
          data.push(111, null);
        }
      } else {
        data.push(111, ShardDyeSerde.serialize(entity.shard_dye));
      }
    }
    if (entity.shard_moisture !== undefined) {
      if (entity.shard_moisture === null) {
        if (encodeDelta) {
          data.push(112, null);
        }
      } else {
        data.push(112, ShardMoistureSerde.serialize(entity.shard_moisture));
      }
    }
    if (entity.shard_growth !== undefined) {
      if (entity.shard_growth === null) {
        if (encodeDelta) {
          data.push(113, null);
        }
      } else {
        data.push(113, ShardGrowthSerde.serialize(entity.shard_growth));
      }
    }
    if (entity.shard_placer !== undefined) {
      if (entity.shard_placer === null) {
        if (encodeDelta) {
          data.push(120, null);
        }
      } else {
        data.push(120, ShardPlacerSerde.serialize(entity.shard_placer));
      }
    }
    if (entity.shard_muck !== undefined) {
      if (entity.shard_muck === null) {
        if (encodeDelta) {
          data.push(124, null);
        }
      } else {
        data.push(124, ShardMuckSerde.serialize(entity.shard_muck));
      }
    }
    if (entity.label !== undefined) {
      if (entity.label === null) {
        if (encodeDelta) {
          data.push(37, null);
        }
      } else {
        data.push(37, LabelSerde.serialize(entity.label));
      }
    }
    if (entity.grab_bag !== undefined) {
      if (entity.grab_bag === null) {
        if (encodeDelta) {
          data.push(51, null);
        }
      } else {
        data.push(51, GrabBagSerde.serialize(entity.grab_bag));
      }
    }
    if (entity.acquisition !== undefined) {
      if (entity.acquisition === null) {
        if (encodeDelta) {
          data.push(52, null);
        }
      } else {
        data.push(52, AcquisitionSerde.serialize(entity.acquisition));
      }
    }
    if (entity.loose_item !== undefined) {
      if (entity.loose_item === null) {
        if (encodeDelta) {
          data.push(53, null);
        }
      } else {
        data.push(53, LooseItemSerde.serialize(entity.loose_item));
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.inventory !== undefined) {
        if (entity.inventory === null) {
          if (encodeDelta) {
            data.push(41, null);
          }
        } else {
          data.push(41, InventorySerde.serialize(entity.inventory));
        }
      }
    }
    if (entity.container_inventory !== undefined) {
      if (entity.container_inventory === null) {
        if (encodeDelta) {
          data.push(79, null);
        }
      } else {
        data.push(
          79,
          ContainerInventorySerde.serialize(entity.container_inventory)
        );
      }
    }
    if (entity.priced_container_inventory !== undefined) {
      if (entity.priced_container_inventory === null) {
        if (encodeDelta) {
          data.push(86, null);
        }
      } else {
        data.push(
          86,
          PricedContainerInventorySerde.serialize(
            entity.priced_container_inventory
          )
        );
      }
    }
    if (entity.selected_item !== undefined) {
      if (entity.selected_item === null) {
        if (encodeDelta) {
          data.push(59, null);
        }
      } else {
        data.push(59, SelectedItemSerde.serialize(entity.selected_item));
      }
    }
    if (entity.wearing !== undefined) {
      if (entity.wearing === null) {
        if (encodeDelta) {
          data.push(49, null);
        }
      } else {
        data.push(49, WearingSerde.serialize(entity.wearing));
      }
    }
    if (entity.emote !== undefined) {
      if (entity.emote === null) {
        if (encodeDelta) {
          data.push(43, null);
        }
      } else {
        data.push(43, EmoteSerde.serialize(entity.emote));
      }
    }
    if (entity.appearance_component !== undefined) {
      if (entity.appearance_component === null) {
        if (encodeDelta) {
          data.push(56, null);
        }
      } else {
        data.push(
          56,
          AppearanceComponentSerde.serialize(entity.appearance_component)
        );
      }
    }
    if (entity.group_component !== undefined) {
      if (entity.group_component === null) {
        if (encodeDelta) {
          data.push(45, null);
        }
      } else {
        data.push(45, GroupComponentSerde.serialize(entity.group_component));
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.challenges !== undefined) {
        if (entity.challenges === null) {
          if (encodeDelta) {
            data.push(46, null);
          }
        } else {
          data.push(46, ChallengesSerde.serialize(entity.challenges));
        }
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.recipe_book !== undefined) {
        if (entity.recipe_book === null) {
          if (encodeDelta) {
            data.push(48, null);
          }
        } else {
          data.push(48, RecipeBookSerde.serialize(entity.recipe_book));
        }
      }
    }
    if (target.whoFor !== "client") {
      if (entity.expires !== undefined) {
        if (entity.expires === null) {
          if (encodeDelta) {
            data.push(50, null);
          }
        } else {
          data.push(50, ExpiresSerde.serialize(entity.expires));
        }
      }
    }
    if (target.whoFor !== "client") {
      if (entity.icing !== undefined) {
        if (entity.icing === null) {
          if (encodeDelta) {
            data.push(58, null);
          }
        } else {
          data.push(58, IcingSerde.serialize(entity.icing));
        }
      }
    }
    if (entity.warpable !== undefined) {
      if (entity.warpable === null) {
        if (encodeDelta) {
          data.push(61, null);
        }
      } else {
        data.push(61, WarpableSerde.serialize(entity.warpable));
      }
    }
    if (entity.player_status !== undefined) {
      if (entity.player_status === null) {
        if (encodeDelta) {
          data.push(63, null);
        }
      } else {
        data.push(63, PlayerStatusSerde.serialize(entity.player_status));
      }
    }
    if (entity.player_behavior !== undefined) {
      if (entity.player_behavior === null) {
        if (encodeDelta) {
          data.push(64, null);
        }
      } else {
        data.push(64, PlayerBehaviorSerde.serialize(entity.player_behavior));
      }
    }
    if (entity.world_metadata !== undefined) {
      if (entity.world_metadata === null) {
        if (encodeDelta) {
          data.push(65, null);
        }
      } else {
        data.push(65, WorldMetadataSerde.serialize(entity.world_metadata));
      }
    }
    if (entity.npc_metadata !== undefined) {
      if (entity.npc_metadata === null) {
        if (encodeDelta) {
          data.push(66, null);
        }
      } else {
        data.push(66, NpcMetadataSerde.serialize(entity.npc_metadata));
      }
    }
    if (target.whoFor !== "client") {
      if (entity.npc_state !== undefined) {
        if (entity.npc_state === null) {
          if (encodeDelta) {
            data.push(67, null);
          }
        } else {
          data.push(67, NpcStateSerde.serialize(entity.npc_state));
        }
      }
    }
    if (entity.group_preview_reference !== undefined) {
      if (entity.group_preview_reference === null) {
        if (encodeDelta) {
          data.push(68, null);
        }
      } else {
        data.push(
          68,
          GroupPreviewReferenceSerde.serialize(entity.group_preview_reference)
        );
      }
    }
    if (entity.acl_component !== undefined) {
      if (entity.acl_component === null) {
        if (encodeDelta) {
          data.push(70, null);
        }
      } else {
        data.push(70, AclComponentSerde.serialize(entity.acl_component));
      }
    }
    if (entity.deed_component !== undefined) {
      if (entity.deed_component === null) {
        if (encodeDelta) {
          data.push(71, null);
        }
      } else {
        data.push(71, DeedComponentSerde.serialize(entity.deed_component));
      }
    }
    if (entity.group_preview_component !== undefined) {
      if (entity.group_preview_component === null) {
        if (encodeDelta) {
          data.push(72, null);
        }
      } else {
        data.push(
          72,
          GroupPreviewComponentSerde.serialize(entity.group_preview_component)
        );
      }
    }
    if (entity.blueprint_component !== undefined) {
      if (entity.blueprint_component === null) {
        if (encodeDelta) {
          data.push(87, null);
        }
      } else {
        data.push(
          87,
          BlueprintComponentSerde.serialize(entity.blueprint_component)
        );
      }
    }
    if (entity.crafting_station_component !== undefined) {
      if (entity.crafting_station_component === null) {
        if (encodeDelta) {
          data.push(74, null);
        }
      } else {
        data.push(
          74,
          CraftingStationComponentSerde.serialize(
            entity.crafting_station_component
          )
        );
      }
    }
    if (entity.health !== undefined) {
      if (entity.health === null) {
        if (encodeDelta) {
          data.push(75, null);
        }
      } else {
        data.push(75, HealthSerde.serialize(entity.health));
      }
    }
    if (entity.buffs_component !== undefined) {
      if (entity.buffs_component === null) {
        if (encodeDelta) {
          data.push(101, null);
        }
      } else {
        data.push(101, BuffsComponentSerde.serialize(entity.buffs_component));
      }
    }
    if (entity.gremlin !== undefined) {
      if (entity.gremlin === null) {
        if (encodeDelta) {
          data.push(77, null);
        }
      } else {
        data.push(77, GremlinSerde.serialize(entity.gremlin));
      }
    }
    if (entity.placeable_component !== undefined) {
      if (entity.placeable_component === null) {
        if (encodeDelta) {
          data.push(78, null);
        }
      } else {
        data.push(
          78,
          PlaceableComponentSerde.serialize(entity.placeable_component)
        );
      }
    }
    if (entity.grouped_entities !== undefined) {
      if (entity.grouped_entities === null) {
        if (encodeDelta) {
          data.push(83, null);
        }
      } else {
        data.push(83, GroupedEntitiesSerde.serialize(entity.grouped_entities));
      }
    }
    if (entity.in_group !== undefined) {
      if (entity.in_group === null) {
        if (encodeDelta) {
          data.push(95, null);
        }
      } else {
        data.push(95, InGroupSerde.serialize(entity.in_group));
      }
    }
    if (entity.picture_frame_contents !== undefined) {
      if (entity.picture_frame_contents === null) {
        if (encodeDelta) {
          data.push(84, null);
        }
      } else {
        data.push(
          84,
          PictureFrameContentsSerde.serialize(entity.picture_frame_contents)
        );
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.trigger_state !== undefined) {
        if (entity.trigger_state === null) {
          if (encodeDelta) {
            data.push(88, null);
          }
        } else {
          data.push(88, TriggerStateSerde.serialize(entity.trigger_state));
        }
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.lifetime_stats !== undefined) {
        if (entity.lifetime_stats === null) {
          if (encodeDelta) {
            data.push(91, null);
          }
        } else {
          data.push(91, LifetimeStatsSerde.serialize(entity.lifetime_stats));
        }
      }
    }
    if (target.whoFor !== "client") {
      if (entity.occupancy_component !== undefined) {
        if (entity.occupancy_component === null) {
          if (encodeDelta) {
            data.push(97, null);
          }
        } else {
          data.push(
            97,
            OccupancyComponentSerde.serialize(entity.occupancy_component)
          );
        }
      }
    }
    if (entity.video_component !== undefined) {
      if (entity.video_component === null) {
        if (encodeDelta) {
          data.push(92, null);
        }
      } else {
        data.push(92, VideoComponentSerde.serialize(entity.video_component));
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.player_session !== undefined) {
        if (entity.player_session === null) {
          if (encodeDelta) {
            data.push(98, null);
          }
        } else {
          data.push(98, PlayerSessionSerde.serialize(entity.player_session));
        }
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.preset_applied !== undefined) {
        if (entity.preset_applied === null) {
          if (encodeDelta) {
            data.push(99, null);
          }
        } else {
          data.push(99, PresetAppliedSerde.serialize(entity.preset_applied));
        }
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.preset_prototype !== undefined) {
        if (entity.preset_prototype === null) {
          if (encodeDelta) {
            data.push(100, null);
          }
        } else {
          data.push(
            100,
            PresetPrototypeSerde.serialize(entity.preset_prototype)
          );
        }
      }
    }
    if (entity.farming_plant_component !== undefined) {
      if (entity.farming_plant_component === null) {
        if (encodeDelta) {
          data.push(102, null);
        }
      } else {
        data.push(
          102,
          FarmingPlantComponentSerde.serialize(entity.farming_plant_component)
        );
      }
    }
    if (entity.shard_farming !== undefined) {
      if (entity.shard_farming === null) {
        if (encodeDelta) {
          data.push(103, null);
        }
      } else {
        data.push(103, ShardFarmingSerde.serialize(entity.shard_farming));
      }
    }
    if (entity.created_by !== undefined) {
      if (entity.created_by === null) {
        if (encodeDelta) {
          data.push(104, null);
        }
      } else {
        data.push(104, CreatedBySerde.serialize(entity.created_by));
      }
    }
    if (entity.minigame_component !== undefined) {
      if (entity.minigame_component === null) {
        if (encodeDelta) {
          data.push(105, null);
        }
      } else {
        data.push(
          105,
          MinigameComponentSerde.serialize(entity.minigame_component)
        );
      }
    }
    if (entity.minigame_instance !== undefined) {
      if (entity.minigame_instance === null) {
        if (encodeDelta) {
          data.push(106, null);
        }
      } else {
        data.push(
          106,
          MinigameInstanceSerde.serialize(entity.minigame_instance)
        );
      }
    }
    if (entity.playing_minigame !== undefined) {
      if (entity.playing_minigame === null) {
        if (encodeDelta) {
          data.push(107, null);
        }
      } else {
        data.push(107, PlayingMinigameSerde.serialize(entity.playing_minigame));
      }
    }
    if (entity.minigame_element !== undefined) {
      if (entity.minigame_element === null) {
        if (encodeDelta) {
          data.push(108, null);
        }
      } else {
        data.push(108, MinigameElementSerde.serialize(entity.minigame_element));
      }
    }
    if (entity.active_tray !== undefined) {
      if (entity.active_tray === null) {
        if (encodeDelta) {
          data.push(109, null);
        }
      } else {
        data.push(109, ActiveTraySerde.serialize(entity.active_tray));
      }
    }
    if (target.whoFor !== "client") {
      if (entity.stashed !== undefined) {
        if (entity.stashed === null) {
          if (encodeDelta) {
            data.push(115, null);
          }
        } else {
          data.push(115, StashedSerde.serialize(entity.stashed));
        }
      }
    }
    if (target.whoFor !== "client") {
      if (entity.minigame_instance_tick_info !== undefined) {
        if (entity.minigame_instance_tick_info === null) {
          if (encodeDelta) {
            data.push(117, null);
          }
        } else {
          data.push(
            117,
            MinigameInstanceTickInfoSerde.serialize(
              entity.minigame_instance_tick_info
            )
          );
        }
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.warping_to !== undefined) {
        if (entity.warping_to === null) {
          if (encodeDelta) {
            data.push(118, null);
          }
        } else {
          data.push(118, WarpingToSerde.serialize(entity.warping_to));
        }
      }
    }
    if (entity.minigame_instance_expire !== undefined) {
      if (entity.minigame_instance_expire === null) {
        if (encodeDelta) {
          data.push(119, null);
        }
      } else {
        data.push(
          119,
          MinigameInstanceExpireSerde.serialize(entity.minigame_instance_expire)
        );
      }
    }
    if (target.whoFor !== "client") {
      if (entity.placer_component !== undefined) {
        if (entity.placer_component === null) {
          if (encodeDelta) {
            data.push(121, null);
          }
        } else {
          data.push(
            121,
            PlacerComponentSerde.serialize(entity.placer_component)
          );
        }
      }
    }
    if (entity.quest_giver !== undefined) {
      if (entity.quest_giver === null) {
        if (encodeDelta) {
          data.push(122, null);
        }
      } else {
        data.push(122, QuestGiverSerde.serialize(entity.quest_giver));
      }
    }
    if (entity.default_dialog !== undefined) {
      if (entity.default_dialog === null) {
        if (encodeDelta) {
          data.push(123, null);
        }
      } else {
        data.push(123, DefaultDialogSerde.serialize(entity.default_dialog));
      }
    }
    if (entity.unmuck !== undefined) {
      if (entity.unmuck === null) {
        if (encodeDelta) {
          data.push(125, null);
        }
      } else {
        data.push(125, UnmuckSerde.serialize(entity.unmuck));
      }
    }
    if (entity.robot_component !== undefined) {
      if (entity.robot_component === null) {
        if (encodeDelta) {
          data.push(126, null);
        }
      } else {
        data.push(126, RobotComponentSerde.serialize(entity.robot_component));
      }
    }
    if (entity.admin_entity !== undefined) {
      if (entity.admin_entity === null) {
        if (encodeDelta) {
          data.push(140, null);
        }
      } else {
        data.push(140, AdminEntitySerde.serialize(entity.admin_entity));
      }
    }
    if (entity.protection !== undefined) {
      if (entity.protection === null) {
        if (encodeDelta) {
          data.push(127, null);
        }
      } else {
        data.push(127, ProtectionSerde.serialize(entity.protection));
      }
    }
    if (entity.projects_protection !== undefined) {
      if (entity.projects_protection === null) {
        if (encodeDelta) {
          data.push(128, null);
        }
      } else {
        data.push(
          128,
          ProjectsProtectionSerde.serialize(entity.projects_protection)
        );
      }
    }
    if (target.whoFor !== "client") {
      if (entity.deletes_with !== undefined) {
        if (entity.deletes_with === null) {
          if (encodeDelta) {
            data.push(129, null);
          }
        } else {
          data.push(129, DeletesWithSerde.serialize(entity.deletes_with));
        }
      }
    }
    if (entity.item_buyer !== undefined) {
      if (entity.item_buyer === null) {
        if (encodeDelta) {
          data.push(130, null);
        }
      } else {
        data.push(130, ItemBuyerSerde.serialize(entity.item_buyer));
      }
    }
    if (entity.inspection_tweaks !== undefined) {
      if (entity.inspection_tweaks === null) {
        if (encodeDelta) {
          data.push(131, null);
        }
      } else {
        data.push(
          131,
          InspectionTweaksSerde.serialize(entity.inspection_tweaks)
        );
      }
    }
    if (entity.profile_pic !== undefined) {
      if (entity.profile_pic === null) {
        if (encodeDelta) {
          data.push(132, null);
        }
      } else {
        data.push(132, ProfilePicSerde.serialize(entity.profile_pic));
      }
    }
    if (entity.entity_description !== undefined) {
      if (entity.entity_description === null) {
        if (encodeDelta) {
          data.push(133, null);
        }
      } else {
        data.push(
          133,
          EntityDescriptionSerde.serialize(entity.entity_description)
        );
      }
    }
    if (entity.landmark !== undefined) {
      if (entity.landmark === null) {
        if (encodeDelta) {
          data.push(134, null);
        }
      } else {
        data.push(134, LandmarkSerde.serialize(entity.landmark));
      }
    }
    if (entity.collideable !== undefined) {
      if (entity.collideable === null) {
        if (encodeDelta) {
          data.push(135, null);
        }
      } else {
        data.push(135, CollideableSerde.serialize(entity.collideable));
      }
    }
    if (entity.restoration !== undefined) {
      if (entity.restoration === null) {
        if (encodeDelta) {
          data.push(136, null);
        }
      } else {
        data.push(136, RestorationSerde.serialize(entity.restoration));
      }
    }
    if (entity.terrain_restoration_diff !== undefined) {
      if (entity.terrain_restoration_diff === null) {
        if (encodeDelta) {
          data.push(137, null);
        }
      } else {
        data.push(
          137,
          TerrainRestorationDiffSerde.serialize(entity.terrain_restoration_diff)
        );
      }
    }
    if (entity.team !== undefined) {
      if (entity.team === null) {
        if (encodeDelta) {
          data.push(138, null);
        }
      } else {
        data.push(138, TeamSerde.serialize(entity.team));
      }
    }
    if (entity.player_current_team !== undefined) {
      if (entity.player_current_team === null) {
        if (encodeDelta) {
          data.push(139, null);
        }
      } else {
        data.push(
          139,
          PlayerCurrentTeamSerde.serialize(entity.player_current_team)
        );
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.user_roles !== undefined) {
        if (entity.user_roles === null) {
          if (encodeDelta) {
            data.push(141, null);
          }
        } else {
          data.push(141, UserRolesSerde.serialize(entity.user_roles));
        }
      }
    }
    if (entity.restores_to !== undefined) {
      if (entity.restores_to === null) {
        if (encodeDelta) {
          data.push(142, null);
        }
      } else {
        data.push(142, RestoresToSerde.serialize(entity.restores_to));
      }
    }
    if (entity.trade !== undefined) {
      if (entity.trade === null) {
        if (encodeDelta) {
          data.push(143, null);
        }
      } else {
        data.push(143, TradeSerde.serialize(entity.trade));
      }
    }
    if (entity.active_trades !== undefined) {
      if (entity.active_trades === null) {
        if (encodeDelta) {
          data.push(144, null);
        }
      } else {
        data.push(144, ActiveTradesSerde.serialize(entity.active_trades));
      }
    }
    if (entity.placed_by !== undefined) {
      if (entity.placed_by === null) {
        if (encodeDelta) {
          data.push(145, null);
        }
      } else {
        data.push(145, PlacedBySerde.serialize(entity.placed_by));
      }
    }
    if (entity.text_sign !== undefined) {
      if (entity.text_sign === null) {
        if (encodeDelta) {
          data.push(146, null);
        }
      } else {
        data.push(146, TextSignSerde.serialize(entity.text_sign));
      }
    }
    if (entity.irradiance !== undefined) {
      if (entity.irradiance === null) {
        if (encodeDelta) {
          data.push(147, null);
        }
      } else {
        data.push(147, IrradianceSerde.serialize(entity.irradiance));
      }
    }
    if (entity.locked_in_place !== undefined) {
      if (entity.locked_in_place === null) {
        if (encodeDelta) {
          data.push(148, null);
        }
      } else {
        data.push(148, LockedInPlaceSerde.serialize(entity.locked_in_place));
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.death_info !== undefined) {
        if (entity.death_info === null) {
          if (encodeDelta) {
            data.push(149, null);
          }
        } else {
          data.push(149, DeathInfoSerde.serialize(entity.death_info));
        }
      }
    }
    if (entity.synthetic_stats !== undefined) {
      if (entity.synthetic_stats === null) {
        if (encodeDelta) {
          data.push(150, null);
        }
      } else {
        data.push(150, SyntheticStatsSerde.serialize(entity.synthetic_stats));
      }
    }
    if (entity.idle !== undefined) {
      if (entity.idle === null) {
        if (encodeDelta) {
          data.push(151, null);
        }
      } else {
        data.push(151, IdleSerde.serialize(entity.idle));
      }
    }
    if (entity.voice !== undefined) {
      if (entity.voice === null) {
        if (encodeDelta) {
          data.push(152, null);
        }
      } else {
        data.push(152, VoiceSerde.serialize(entity.voice));
      }
    }
    if (target.whoFor !== "client" || entity.id === target.id) {
      if (entity.gift_giver !== undefined) {
        if (entity.gift_giver === null) {
          if (encodeDelta) {
            data.push(153, null);
          }
        } else {
          data.push(153, GiftGiverSerde.serialize(entity.gift_giver));
        }
      }
    }
    return data;
  }

  private static decodeArrayData(
    data: unknown[],
    decodeDelta: boolean
  ): e.AsDelta<e.Entity> | e.Entity {
    if (data.length === 0) {
      badEntity("empty array data", data);
    } else if (data.length === 2 && typeof data[1] === "object") {
      // Legacy Entity.
      const legacyEntity = data[1] as any;
      const entity: any = {
        id: legacyEntity.id,
      };
      if (!isBiomesId(entity.id)) {
        badEntity("invalid id", data);
      }
      {
        const value = legacyEntity.iced;
        if (value === null && decodeDelta) {
          entity.iced = null;
        } else if (value) {
          entity.iced = IcedSerde.deserialize(legacyEntity.iced);
        }
      }
      {
        const value = legacyEntity.remote_connection;
        if (value === null && decodeDelta) {
          entity.remote_connection = null;
        } else if (value) {
          entity.remote_connection = RemoteConnectionSerde.deserialize(
            legacyEntity.remote_connection
          );
        }
      }
      {
        const value = legacyEntity.position;
        if (value === null && decodeDelta) {
          entity.position = null;
        } else if (value) {
          entity.position = PositionSerde.deserialize(legacyEntity.position);
        }
      }
      {
        const value = legacyEntity.orientation;
        if (value === null && decodeDelta) {
          entity.orientation = null;
        } else if (value) {
          entity.orientation = OrientationSerde.deserialize(
            legacyEntity.orientation
          );
        }
      }
      {
        const value = legacyEntity.rigid_body;
        if (value === null && decodeDelta) {
          entity.rigid_body = null;
        } else if (value) {
          entity.rigid_body = RigidBodySerde.deserialize(
            legacyEntity.rigid_body
          );
        }
      }
      {
        const value = legacyEntity.size;
        if (value === null && decodeDelta) {
          entity.size = null;
        } else if (value) {
          entity.size = SizeSerde.deserialize(legacyEntity.size);
        }
      }
      {
        const value = legacyEntity.box;
        if (value === null && decodeDelta) {
          entity.box = null;
        } else if (value) {
          entity.box = BoxSerde.deserialize(legacyEntity.box);
        }
      }
      {
        const value = legacyEntity.shard_seed;
        if (value === null && decodeDelta) {
          entity.shard_seed = null;
        } else if (value) {
          entity.shard_seed = ShardSeedSerde.deserialize(
            legacyEntity.shard_seed
          );
        }
      }
      {
        const value = legacyEntity.shard_diff;
        if (value === null && decodeDelta) {
          entity.shard_diff = null;
        } else if (value) {
          entity.shard_diff = ShardDiffSerde.deserialize(
            legacyEntity.shard_diff
          );
        }
      }
      {
        const value = legacyEntity.shard_shapes;
        if (value === null && decodeDelta) {
          entity.shard_shapes = null;
        } else if (value) {
          entity.shard_shapes = ShardShapesSerde.deserialize(
            legacyEntity.shard_shapes
          );
        }
      }
      {
        const value = legacyEntity.shard_sky_occlusion;
        if (value === null && decodeDelta) {
          entity.shard_sky_occlusion = null;
        } else if (value) {
          entity.shard_sky_occlusion = ShardSkyOcclusionSerde.deserialize(
            legacyEntity.shard_sky_occlusion
          );
        }
      }
      {
        const value = legacyEntity.shard_irradiance;
        if (value === null && decodeDelta) {
          entity.shard_irradiance = null;
        } else if (value) {
          entity.shard_irradiance = ShardIrradianceSerde.deserialize(
            legacyEntity.shard_irradiance
          );
        }
      }
      {
        const value = legacyEntity.shard_water;
        if (value === null && decodeDelta) {
          entity.shard_water = null;
        } else if (value) {
          entity.shard_water = ShardWaterSerde.deserialize(
            legacyEntity.shard_water
          );
        }
      }
      {
        const value = legacyEntity.shard_occupancy;
        if (value === null && decodeDelta) {
          entity.shard_occupancy = null;
        } else if (value) {
          entity.shard_occupancy = ShardOccupancySerde.deserialize(
            legacyEntity.shard_occupancy
          );
        }
      }
      {
        const value = legacyEntity.shard_dye;
        if (value === null && decodeDelta) {
          entity.shard_dye = null;
        } else if (value) {
          entity.shard_dye = ShardDyeSerde.deserialize(legacyEntity.shard_dye);
        }
      }
      {
        const value = legacyEntity.shard_moisture;
        if (value === null && decodeDelta) {
          entity.shard_moisture = null;
        } else if (value) {
          entity.shard_moisture = ShardMoistureSerde.deserialize(
            legacyEntity.shard_moisture
          );
        }
      }
      {
        const value = legacyEntity.shard_growth;
        if (value === null && decodeDelta) {
          entity.shard_growth = null;
        } else if (value) {
          entity.shard_growth = ShardGrowthSerde.deserialize(
            legacyEntity.shard_growth
          );
        }
      }
      {
        const value = legacyEntity.shard_placer;
        if (value === null && decodeDelta) {
          entity.shard_placer = null;
        } else if (value) {
          entity.shard_placer = ShardPlacerSerde.deserialize(
            legacyEntity.shard_placer
          );
        }
      }
      {
        const value = legacyEntity.shard_muck;
        if (value === null && decodeDelta) {
          entity.shard_muck = null;
        } else if (value) {
          entity.shard_muck = ShardMuckSerde.deserialize(
            legacyEntity.shard_muck
          );
        }
      }
      {
        const value = legacyEntity.label;
        if (value === null && decodeDelta) {
          entity.label = null;
        } else if (value) {
          entity.label = LabelSerde.deserialize(legacyEntity.label);
        }
      }
      {
        const value = legacyEntity.grab_bag;
        if (value === null && decodeDelta) {
          entity.grab_bag = null;
        } else if (value) {
          entity.grab_bag = GrabBagSerde.deserialize(legacyEntity.grab_bag);
        }
      }
      {
        const value = legacyEntity.acquisition;
        if (value === null && decodeDelta) {
          entity.acquisition = null;
        } else if (value) {
          entity.acquisition = AcquisitionSerde.deserialize(
            legacyEntity.acquisition
          );
        }
      }
      {
        const value = legacyEntity.loose_item;
        if (value === null && decodeDelta) {
          entity.loose_item = null;
        } else if (value) {
          entity.loose_item = LooseItemSerde.deserialize(
            legacyEntity.loose_item
          );
        }
      }
      {
        const value = legacyEntity.inventory;
        if (value === null && decodeDelta) {
          entity.inventory = null;
        } else if (value) {
          entity.inventory = InventorySerde.deserialize(legacyEntity.inventory);
        }
      }
      {
        const value = legacyEntity.container_inventory;
        if (value === null && decodeDelta) {
          entity.container_inventory = null;
        } else if (value) {
          entity.container_inventory = ContainerInventorySerde.deserialize(
            legacyEntity.container_inventory
          );
        }
      }
      {
        const value = legacyEntity.priced_container_inventory;
        if (value === null && decodeDelta) {
          entity.priced_container_inventory = null;
        } else if (value) {
          entity.priced_container_inventory =
            PricedContainerInventorySerde.deserialize(
              legacyEntity.priced_container_inventory
            );
        }
      }
      {
        const value = legacyEntity.selected_item;
        if (value === null && decodeDelta) {
          entity.selected_item = null;
        } else if (value) {
          entity.selected_item = SelectedItemSerde.deserialize(
            legacyEntity.selected_item
          );
        }
      }
      {
        const value = legacyEntity.wearing;
        if (value === null && decodeDelta) {
          entity.wearing = null;
        } else if (value) {
          entity.wearing = WearingSerde.deserialize(legacyEntity.wearing);
        }
      }
      {
        const value = legacyEntity.emote;
        if (value === null && decodeDelta) {
          entity.emote = null;
        } else if (value) {
          entity.emote = EmoteSerde.deserialize(legacyEntity.emote);
        }
      }
      {
        const value = legacyEntity.appearance_component;
        if (value === null && decodeDelta) {
          entity.appearance_component = null;
        } else if (value) {
          entity.appearance_component = AppearanceComponentSerde.deserialize(
            legacyEntity.appearance_component
          );
        }
      }
      {
        const value = legacyEntity.group_component;
        if (value === null && decodeDelta) {
          entity.group_component = null;
        } else if (value) {
          entity.group_component = GroupComponentSerde.deserialize(
            legacyEntity.group_component
          );
        }
      }
      {
        const value = legacyEntity.challenges;
        if (value === null && decodeDelta) {
          entity.challenges = null;
        } else if (value) {
          entity.challenges = ChallengesSerde.deserialize(
            legacyEntity.challenges
          );
        }
      }
      {
        const value = legacyEntity.recipe_book;
        if (value === null && decodeDelta) {
          entity.recipe_book = null;
        } else if (value) {
          entity.recipe_book = RecipeBookSerde.deserialize(
            legacyEntity.recipe_book
          );
        }
      }
      {
        const value = legacyEntity.expires;
        if (value === null && decodeDelta) {
          entity.expires = null;
        } else if (value) {
          entity.expires = ExpiresSerde.deserialize(legacyEntity.expires);
        }
      }
      {
        const value = legacyEntity.icing;
        if (value === null && decodeDelta) {
          entity.icing = null;
        } else if (value) {
          entity.icing = IcingSerde.deserialize(legacyEntity.icing);
        }
      }
      {
        const value = legacyEntity.warpable;
        if (value === null && decodeDelta) {
          entity.warpable = null;
        } else if (value) {
          entity.warpable = WarpableSerde.deserialize(legacyEntity.warpable);
        }
      }
      {
        const value = legacyEntity.player_status;
        if (value === null && decodeDelta) {
          entity.player_status = null;
        } else if (value) {
          entity.player_status = PlayerStatusSerde.deserialize(
            legacyEntity.player_status
          );
        }
      }
      {
        const value = legacyEntity.player_behavior;
        if (value === null && decodeDelta) {
          entity.player_behavior = null;
        } else if (value) {
          entity.player_behavior = PlayerBehaviorSerde.deserialize(
            legacyEntity.player_behavior
          );
        }
      }
      {
        const value = legacyEntity.world_metadata;
        if (value === null && decodeDelta) {
          entity.world_metadata = null;
        } else if (value) {
          entity.world_metadata = WorldMetadataSerde.deserialize(
            legacyEntity.world_metadata
          );
        }
      }
      {
        const value = legacyEntity.npc_metadata;
        if (value === null && decodeDelta) {
          entity.npc_metadata = null;
        } else if (value) {
          entity.npc_metadata = NpcMetadataSerde.deserialize(
            legacyEntity.npc_metadata
          );
        }
      }
      {
        const value = legacyEntity.npc_state;
        if (value === null && decodeDelta) {
          entity.npc_state = null;
        } else if (value) {
          entity.npc_state = NpcStateSerde.deserialize(legacyEntity.npc_state);
        }
      }
      {
        const value = legacyEntity.group_preview_reference;
        if (value === null && decodeDelta) {
          entity.group_preview_reference = null;
        } else if (value) {
          entity.group_preview_reference =
            GroupPreviewReferenceSerde.deserialize(
              legacyEntity.group_preview_reference
            );
        }
      }
      {
        const value = legacyEntity.acl_component;
        if (value === null && decodeDelta) {
          entity.acl_component = null;
        } else if (value) {
          entity.acl_component = AclComponentSerde.deserialize(
            legacyEntity.acl_component
          );
        }
      }
      {
        const value = legacyEntity.deed_component;
        if (value === null && decodeDelta) {
          entity.deed_component = null;
        } else if (value) {
          entity.deed_component = DeedComponentSerde.deserialize(
            legacyEntity.deed_component
          );
        }
      }
      {
        const value = legacyEntity.group_preview_component;
        if (value === null && decodeDelta) {
          entity.group_preview_component = null;
        } else if (value) {
          entity.group_preview_component =
            GroupPreviewComponentSerde.deserialize(
              legacyEntity.group_preview_component
            );
        }
      }
      {
        const value = legacyEntity.blueprint_component;
        if (value === null && decodeDelta) {
          entity.blueprint_component = null;
        } else if (value) {
          entity.blueprint_component = BlueprintComponentSerde.deserialize(
            legacyEntity.blueprint_component
          );
        }
      }
      {
        const value = legacyEntity.crafting_station_component;
        if (value === null && decodeDelta) {
          entity.crafting_station_component = null;
        } else if (value) {
          entity.crafting_station_component =
            CraftingStationComponentSerde.deserialize(
              legacyEntity.crafting_station_component
            );
        }
      }
      {
        const value = legacyEntity.health;
        if (value === null && decodeDelta) {
          entity.health = null;
        } else if (value) {
          entity.health = HealthSerde.deserialize(legacyEntity.health);
        }
      }
      {
        const value = legacyEntity.buffs_component;
        if (value === null && decodeDelta) {
          entity.buffs_component = null;
        } else if (value) {
          entity.buffs_component = BuffsComponentSerde.deserialize(
            legacyEntity.buffs_component
          );
        }
      }
      {
        const value = legacyEntity.gremlin;
        if (value === null && decodeDelta) {
          entity.gremlin = null;
        } else if (value) {
          entity.gremlin = GremlinSerde.deserialize(legacyEntity.gremlin);
        }
      }
      {
        const value = legacyEntity.placeable_component;
        if (value === null && decodeDelta) {
          entity.placeable_component = null;
        } else if (value) {
          entity.placeable_component = PlaceableComponentSerde.deserialize(
            legacyEntity.placeable_component
          );
        }
      }
      {
        const value = legacyEntity.grouped_entities;
        if (value === null && decodeDelta) {
          entity.grouped_entities = null;
        } else if (value) {
          entity.grouped_entities = GroupedEntitiesSerde.deserialize(
            legacyEntity.grouped_entities
          );
        }
      }
      {
        const value = legacyEntity.in_group;
        if (value === null && decodeDelta) {
          entity.in_group = null;
        } else if (value) {
          entity.in_group = InGroupSerde.deserialize(legacyEntity.in_group);
        }
      }
      {
        const value = legacyEntity.picture_frame_contents;
        if (value === null && decodeDelta) {
          entity.picture_frame_contents = null;
        } else if (value) {
          entity.picture_frame_contents = PictureFrameContentsSerde.deserialize(
            legacyEntity.picture_frame_contents
          );
        }
      }
      {
        const value = legacyEntity.trigger_state;
        if (value === null && decodeDelta) {
          entity.trigger_state = null;
        } else if (value) {
          entity.trigger_state = TriggerStateSerde.deserialize(
            legacyEntity.trigger_state
          );
        }
      }
      {
        const value = legacyEntity.lifetime_stats;
        if (value === null && decodeDelta) {
          entity.lifetime_stats = null;
        } else if (value) {
          entity.lifetime_stats = LifetimeStatsSerde.deserialize(
            legacyEntity.lifetime_stats
          );
        }
      }
      {
        const value = legacyEntity.occupancy_component;
        if (value === null && decodeDelta) {
          entity.occupancy_component = null;
        } else if (value) {
          entity.occupancy_component = OccupancyComponentSerde.deserialize(
            legacyEntity.occupancy_component
          );
        }
      }
      {
        const value = legacyEntity.video_component;
        if (value === null && decodeDelta) {
          entity.video_component = null;
        } else if (value) {
          entity.video_component = VideoComponentSerde.deserialize(
            legacyEntity.video_component
          );
        }
      }
      {
        const value = legacyEntity.player_session;
        if (value === null && decodeDelta) {
          entity.player_session = null;
        } else if (value) {
          entity.player_session = PlayerSessionSerde.deserialize(
            legacyEntity.player_session
          );
        }
      }
      {
        const value = legacyEntity.preset_applied;
        if (value === null && decodeDelta) {
          entity.preset_applied = null;
        } else if (value) {
          entity.preset_applied = PresetAppliedSerde.deserialize(
            legacyEntity.preset_applied
          );
        }
      }
      {
        const value = legacyEntity.preset_prototype;
        if (value === null && decodeDelta) {
          entity.preset_prototype = null;
        } else if (value) {
          entity.preset_prototype = PresetPrototypeSerde.deserialize(
            legacyEntity.preset_prototype
          );
        }
      }
      {
        const value = legacyEntity.farming_plant_component;
        if (value === null && decodeDelta) {
          entity.farming_plant_component = null;
        } else if (value) {
          entity.farming_plant_component =
            FarmingPlantComponentSerde.deserialize(
              legacyEntity.farming_plant_component
            );
        }
      }
      {
        const value = legacyEntity.shard_farming;
        if (value === null && decodeDelta) {
          entity.shard_farming = null;
        } else if (value) {
          entity.shard_farming = ShardFarmingSerde.deserialize(
            legacyEntity.shard_farming
          );
        }
      }
      {
        const value = legacyEntity.created_by;
        if (value === null && decodeDelta) {
          entity.created_by = null;
        } else if (value) {
          entity.created_by = CreatedBySerde.deserialize(
            legacyEntity.created_by
          );
        }
      }
      {
        const value = legacyEntity.minigame_component;
        if (value === null && decodeDelta) {
          entity.minigame_component = null;
        } else if (value) {
          entity.minigame_component = MinigameComponentSerde.deserialize(
            legacyEntity.minigame_component
          );
        }
      }
      {
        const value = legacyEntity.minigame_instance;
        if (value === null && decodeDelta) {
          entity.minigame_instance = null;
        } else if (value) {
          entity.minigame_instance = MinigameInstanceSerde.deserialize(
            legacyEntity.minigame_instance
          );
        }
      }
      {
        const value = legacyEntity.playing_minigame;
        if (value === null && decodeDelta) {
          entity.playing_minigame = null;
        } else if (value) {
          entity.playing_minigame = PlayingMinigameSerde.deserialize(
            legacyEntity.playing_minigame
          );
        }
      }
      {
        const value = legacyEntity.minigame_element;
        if (value === null && decodeDelta) {
          entity.minigame_element = null;
        } else if (value) {
          entity.minigame_element = MinigameElementSerde.deserialize(
            legacyEntity.minigame_element
          );
        }
      }
      {
        const value = legacyEntity.active_tray;
        if (value === null && decodeDelta) {
          entity.active_tray = null;
        } else if (value) {
          entity.active_tray = ActiveTraySerde.deserialize(
            legacyEntity.active_tray
          );
        }
      }
      {
        const value = legacyEntity.stashed;
        if (value === null && decodeDelta) {
          entity.stashed = null;
        } else if (value) {
          entity.stashed = StashedSerde.deserialize(legacyEntity.stashed);
        }
      }
      {
        const value = legacyEntity.minigame_instance_tick_info;
        if (value === null && decodeDelta) {
          entity.minigame_instance_tick_info = null;
        } else if (value) {
          entity.minigame_instance_tick_info =
            MinigameInstanceTickInfoSerde.deserialize(
              legacyEntity.minigame_instance_tick_info
            );
        }
      }
      {
        const value = legacyEntity.warping_to;
        if (value === null && decodeDelta) {
          entity.warping_to = null;
        } else if (value) {
          entity.warping_to = WarpingToSerde.deserialize(
            legacyEntity.warping_to
          );
        }
      }
      {
        const value = legacyEntity.minigame_instance_expire;
        if (value === null && decodeDelta) {
          entity.minigame_instance_expire = null;
        } else if (value) {
          entity.minigame_instance_expire =
            MinigameInstanceExpireSerde.deserialize(
              legacyEntity.minigame_instance_expire
            );
        }
      }
      {
        const value = legacyEntity.placer_component;
        if (value === null && decodeDelta) {
          entity.placer_component = null;
        } else if (value) {
          entity.placer_component = PlacerComponentSerde.deserialize(
            legacyEntity.placer_component
          );
        }
      }
      {
        const value = legacyEntity.quest_giver;
        if (value === null && decodeDelta) {
          entity.quest_giver = null;
        } else if (value) {
          entity.quest_giver = QuestGiverSerde.deserialize(
            legacyEntity.quest_giver
          );
        }
      }
      {
        const value = legacyEntity.default_dialog;
        if (value === null && decodeDelta) {
          entity.default_dialog = null;
        } else if (value) {
          entity.default_dialog = DefaultDialogSerde.deserialize(
            legacyEntity.default_dialog
          );
        }
      }
      {
        const value = legacyEntity.unmuck;
        if (value === null && decodeDelta) {
          entity.unmuck = null;
        } else if (value) {
          entity.unmuck = UnmuckSerde.deserialize(legacyEntity.unmuck);
        }
      }
      {
        const value = legacyEntity.robot_component;
        if (value === null && decodeDelta) {
          entity.robot_component = null;
        } else if (value) {
          entity.robot_component = RobotComponentSerde.deserialize(
            legacyEntity.robot_component
          );
        }
      }
      {
        const value = legacyEntity.admin_entity;
        if (value === null && decodeDelta) {
          entity.admin_entity = null;
        } else if (value) {
          entity.admin_entity = AdminEntitySerde.deserialize(
            legacyEntity.admin_entity
          );
        }
      }
      {
        const value = legacyEntity.protection;
        if (value === null && decodeDelta) {
          entity.protection = null;
        } else if (value) {
          entity.protection = ProtectionSerde.deserialize(
            legacyEntity.protection
          );
        }
      }
      {
        const value = legacyEntity.projects_protection;
        if (value === null && decodeDelta) {
          entity.projects_protection = null;
        } else if (value) {
          entity.projects_protection = ProjectsProtectionSerde.deserialize(
            legacyEntity.projects_protection
          );
        }
      }
      {
        const value = legacyEntity.deletes_with;
        if (value === null && decodeDelta) {
          entity.deletes_with = null;
        } else if (value) {
          entity.deletes_with = DeletesWithSerde.deserialize(
            legacyEntity.deletes_with
          );
        }
      }
      {
        const value = legacyEntity.item_buyer;
        if (value === null && decodeDelta) {
          entity.item_buyer = null;
        } else if (value) {
          entity.item_buyer = ItemBuyerSerde.deserialize(
            legacyEntity.item_buyer
          );
        }
      }
      {
        const value = legacyEntity.inspection_tweaks;
        if (value === null && decodeDelta) {
          entity.inspection_tweaks = null;
        } else if (value) {
          entity.inspection_tweaks = InspectionTweaksSerde.deserialize(
            legacyEntity.inspection_tweaks
          );
        }
      }
      {
        const value = legacyEntity.profile_pic;
        if (value === null && decodeDelta) {
          entity.profile_pic = null;
        } else if (value) {
          entity.profile_pic = ProfilePicSerde.deserialize(
            legacyEntity.profile_pic
          );
        }
      }
      {
        const value = legacyEntity.entity_description;
        if (value === null && decodeDelta) {
          entity.entity_description = null;
        } else if (value) {
          entity.entity_description = EntityDescriptionSerde.deserialize(
            legacyEntity.entity_description
          );
        }
      }
      {
        const value = legacyEntity.landmark;
        if (value === null && decodeDelta) {
          entity.landmark = null;
        } else if (value) {
          entity.landmark = LandmarkSerde.deserialize(legacyEntity.landmark);
        }
      }
      {
        const value = legacyEntity.collideable;
        if (value === null && decodeDelta) {
          entity.collideable = null;
        } else if (value) {
          entity.collideable = CollideableSerde.deserialize(
            legacyEntity.collideable
          );
        }
      }
      {
        const value = legacyEntity.restoration;
        if (value === null && decodeDelta) {
          entity.restoration = null;
        } else if (value) {
          entity.restoration = RestorationSerde.deserialize(
            legacyEntity.restoration
          );
        }
      }
      {
        const value = legacyEntity.terrain_restoration_diff;
        if (value === null && decodeDelta) {
          entity.terrain_restoration_diff = null;
        } else if (value) {
          entity.terrain_restoration_diff =
            TerrainRestorationDiffSerde.deserialize(
              legacyEntity.terrain_restoration_diff
            );
        }
      }
      {
        const value = legacyEntity.team;
        if (value === null && decodeDelta) {
          entity.team = null;
        } else if (value) {
          entity.team = TeamSerde.deserialize(legacyEntity.team);
        }
      }
      {
        const value = legacyEntity.player_current_team;
        if (value === null && decodeDelta) {
          entity.player_current_team = null;
        } else if (value) {
          entity.player_current_team = PlayerCurrentTeamSerde.deserialize(
            legacyEntity.player_current_team
          );
        }
      }
      {
        const value = legacyEntity.user_roles;
        if (value === null && decodeDelta) {
          entity.user_roles = null;
        } else if (value) {
          entity.user_roles = UserRolesSerde.deserialize(
            legacyEntity.user_roles
          );
        }
      }
      {
        const value = legacyEntity.restores_to;
        if (value === null && decodeDelta) {
          entity.restores_to = null;
        } else if (value) {
          entity.restores_to = RestoresToSerde.deserialize(
            legacyEntity.restores_to
          );
        }
      }
      {
        const value = legacyEntity.trade;
        if (value === null && decodeDelta) {
          entity.trade = null;
        } else if (value) {
          entity.trade = TradeSerde.deserialize(legacyEntity.trade);
        }
      }
      {
        const value = legacyEntity.active_trades;
        if (value === null && decodeDelta) {
          entity.active_trades = null;
        } else if (value) {
          entity.active_trades = ActiveTradesSerde.deserialize(
            legacyEntity.active_trades
          );
        }
      }
      {
        const value = legacyEntity.placed_by;
        if (value === null && decodeDelta) {
          entity.placed_by = null;
        } else if (value) {
          entity.placed_by = PlacedBySerde.deserialize(legacyEntity.placed_by);
        }
      }
      {
        const value = legacyEntity.text_sign;
        if (value === null && decodeDelta) {
          entity.text_sign = null;
        } else if (value) {
          entity.text_sign = TextSignSerde.deserialize(legacyEntity.text_sign);
        }
      }
      {
        const value = legacyEntity.irradiance;
        if (value === null && decodeDelta) {
          entity.irradiance = null;
        } else if (value) {
          entity.irradiance = IrradianceSerde.deserialize(
            legacyEntity.irradiance
          );
        }
      }
      {
        const value = legacyEntity.locked_in_place;
        if (value === null && decodeDelta) {
          entity.locked_in_place = null;
        } else if (value) {
          entity.locked_in_place = LockedInPlaceSerde.deserialize(
            legacyEntity.locked_in_place
          );
        }
      }
      {
        const value = legacyEntity.death_info;
        if (value === null && decodeDelta) {
          entity.death_info = null;
        } else if (value) {
          entity.death_info = DeathInfoSerde.deserialize(
            legacyEntity.death_info
          );
        }
      }
      {
        const value = legacyEntity.synthetic_stats;
        if (value === null && decodeDelta) {
          entity.synthetic_stats = null;
        } else if (value) {
          entity.synthetic_stats = SyntheticStatsSerde.deserialize(
            legacyEntity.synthetic_stats
          );
        }
      }
      {
        const value = legacyEntity.idle;
        if (value === null && decodeDelta) {
          entity.idle = null;
        } else if (value) {
          entity.idle = IdleSerde.deserialize(legacyEntity.idle);
        }
      }
      {
        const value = legacyEntity.voice;
        if (value === null && decodeDelta) {
          entity.voice = null;
        } else if (value) {
          entity.voice = VoiceSerde.deserialize(legacyEntity.voice);
        }
      }
      {
        const value = legacyEntity.gift_giver;
        if (value === null && decodeDelta) {
          entity.gift_giver = null;
        } else if (value) {
          entity.gift_giver = GiftGiverSerde.deserialize(
            legacyEntity.gift_giver
          );
        }
      }
      return entity as e.Entity;
    }

    // Modern entity.
    if (data.length % 2 !== 1) {
      badEntity("data length uneven", data);
    }
    const id = parseBiomesId(data[0]);
    const entity: any = {
      id,
    };
    for (let i = 1; i < data.length; ++i) {
      const componentId = data[i];
      if (typeof componentId !== "number") {
        badEntity("non-numeric component id", data);
      }
      const payload = data[++i];
      if (payload === null) {
        if (decodeDelta) {
          entity[COMPONENT_ID_TO_PROP_NAME[componentId as number]] = null;
          continue;
        }
        badEntity("null component", data);
      } else if (!payload) {
        continue;
      }
      try {
        const deserialize =
          COMPONENT_ID_TO_DESERIALIZE[
            componentId as keyof typeof COMPONENT_ID_TO_DESERIALIZE
          ];
        if (!deserialize) {
          if (c.DEPRECATED_COMPONENT_IDS.has(componentId)) {
            continue;
          }
          badEntity(`unknown component id: ${componentId}`, data);
        }
        const component = deserialize(payload);
        if (!component) {
          badEntity(`invalid component ${componentId}`, data);
        }
        entity[COMPONENT_ID_TO_PROP_NAME[componentId as number]] = component;
      } catch (error) {
        if (process.env.IS_SERVER) {
          log.error(`${id}: Could not understand component: ${componentId}`, {
            error,
          });
          throw error;
        } else {
          log.warn(
            `${id}: Could not understand component: ${componentId}, ignoring`,
            {
              error,
            }
          );
        }
      }
    }
    return entity as e.Entity;
  }

  static deserialize(entityData: unknown, decodeDelta: false): e.Entity;
  static deserialize(
    entityData: undefined | unknown,
    decodeDelta: false
  ): e.Entity | undefined;
  static deserialize(
    entityData: unknown,
    decodeDelta: true
  ): e.AsDelta<e.Entity>;
  static deserialize(
    entityData: undefined | unknown,
    decodeDelta: true
  ): e.AsDelta<e.Entity> | undefined;
  static deserialize(
    entityData: unknown,
    decodeDelta: boolean = false
  ): e.AsDelta<e.Entity> | e.Entity | undefined {
    if (!entityData) {
      return undefined;
    }
    if (Array.isArray(entityData)) {
      return EntitySerde.decodeArrayData(entityData, decodeDelta);
    } else if (typeof entityData !== "object") {
      badEntity("non-object", entityData);
    }
    const entity: any = {
      id: (entityData as any)[0],
    };
    if (!isBiomesId(entity.id)) {
      badEntity("invalid id", entityData);
    }
    {
      const field = (entityData as any)[57];
      if (field === null && decodeDelta) {
        entity.iced = null;
      } else if (field) {
        entity.iced = IcedSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[31];
      if (field === null && decodeDelta) {
        entity.remote_connection = null;
      } else if (field) {
        entity.remote_connection = RemoteConnectionSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[54];
      if (field === null && decodeDelta) {
        entity.position = null;
      } else if (field) {
        entity.position = PositionSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[55];
      if (field === null && decodeDelta) {
        entity.orientation = null;
      } else if (field) {
        entity.orientation = OrientationSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[32];
      if (field === null && decodeDelta) {
        entity.rigid_body = null;
      } else if (field) {
        entity.rigid_body = RigidBodySerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[110];
      if (field === null && decodeDelta) {
        entity.size = null;
      } else if (field) {
        entity.size = SizeSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[33];
      if (field === null && decodeDelta) {
        entity.box = null;
      } else if (field) {
        entity.box = BoxSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[34];
      if (field === null && decodeDelta) {
        entity.shard_seed = null;
      } else if (field) {
        entity.shard_seed = ShardSeedSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[35];
      if (field === null && decodeDelta) {
        entity.shard_diff = null;
      } else if (field) {
        entity.shard_diff = ShardDiffSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[60];
      if (field === null && decodeDelta) {
        entity.shard_shapes = null;
      } else if (field) {
        entity.shard_shapes = ShardShapesSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[76];
      if (field === null && decodeDelta) {
        entity.shard_sky_occlusion = null;
      } else if (field) {
        entity.shard_sky_occlusion = ShardSkyOcclusionSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[80];
      if (field === null && decodeDelta) {
        entity.shard_irradiance = null;
      } else if (field) {
        entity.shard_irradiance = ShardIrradianceSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[82];
      if (field === null && decodeDelta) {
        entity.shard_water = null;
      } else if (field) {
        entity.shard_water = ShardWaterSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[93];
      if (field === null && decodeDelta) {
        entity.shard_occupancy = null;
      } else if (field) {
        entity.shard_occupancy = ShardOccupancySerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[111];
      if (field === null && decodeDelta) {
        entity.shard_dye = null;
      } else if (field) {
        entity.shard_dye = ShardDyeSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[112];
      if (field === null && decodeDelta) {
        entity.shard_moisture = null;
      } else if (field) {
        entity.shard_moisture = ShardMoistureSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[113];
      if (field === null && decodeDelta) {
        entity.shard_growth = null;
      } else if (field) {
        entity.shard_growth = ShardGrowthSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[120];
      if (field === null && decodeDelta) {
        entity.shard_placer = null;
      } else if (field) {
        entity.shard_placer = ShardPlacerSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[124];
      if (field === null && decodeDelta) {
        entity.shard_muck = null;
      } else if (field) {
        entity.shard_muck = ShardMuckSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[37];
      if (field === null && decodeDelta) {
        entity.label = null;
      } else if (field) {
        entity.label = LabelSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[51];
      if (field === null && decodeDelta) {
        entity.grab_bag = null;
      } else if (field) {
        entity.grab_bag = GrabBagSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[52];
      if (field === null && decodeDelta) {
        entity.acquisition = null;
      } else if (field) {
        entity.acquisition = AcquisitionSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[53];
      if (field === null && decodeDelta) {
        entity.loose_item = null;
      } else if (field) {
        entity.loose_item = LooseItemSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[41];
      if (field === null && decodeDelta) {
        entity.inventory = null;
      } else if (field) {
        entity.inventory = InventorySerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[79];
      if (field === null && decodeDelta) {
        entity.container_inventory = null;
      } else if (field) {
        entity.container_inventory = ContainerInventorySerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[86];
      if (field === null && decodeDelta) {
        entity.priced_container_inventory = null;
      } else if (field) {
        entity.priced_container_inventory =
          PricedContainerInventorySerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[59];
      if (field === null && decodeDelta) {
        entity.selected_item = null;
      } else if (field) {
        entity.selected_item = SelectedItemSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[49];
      if (field === null && decodeDelta) {
        entity.wearing = null;
      } else if (field) {
        entity.wearing = WearingSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[43];
      if (field === null && decodeDelta) {
        entity.emote = null;
      } else if (field) {
        entity.emote = EmoteSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[56];
      if (field === null && decodeDelta) {
        entity.appearance_component = null;
      } else if (field) {
        entity.appearance_component =
          AppearanceComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[45];
      if (field === null && decodeDelta) {
        entity.group_component = null;
      } else if (field) {
        entity.group_component = GroupComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[46];
      if (field === null && decodeDelta) {
        entity.challenges = null;
      } else if (field) {
        entity.challenges = ChallengesSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[48];
      if (field === null && decodeDelta) {
        entity.recipe_book = null;
      } else if (field) {
        entity.recipe_book = RecipeBookSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[50];
      if (field === null && decodeDelta) {
        entity.expires = null;
      } else if (field) {
        entity.expires = ExpiresSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[58];
      if (field === null && decodeDelta) {
        entity.icing = null;
      } else if (field) {
        entity.icing = IcingSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[61];
      if (field === null && decodeDelta) {
        entity.warpable = null;
      } else if (field) {
        entity.warpable = WarpableSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[63];
      if (field === null && decodeDelta) {
        entity.player_status = null;
      } else if (field) {
        entity.player_status = PlayerStatusSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[64];
      if (field === null && decodeDelta) {
        entity.player_behavior = null;
      } else if (field) {
        entity.player_behavior = PlayerBehaviorSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[65];
      if (field === null && decodeDelta) {
        entity.world_metadata = null;
      } else if (field) {
        entity.world_metadata = WorldMetadataSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[66];
      if (field === null && decodeDelta) {
        entity.npc_metadata = null;
      } else if (field) {
        entity.npc_metadata = NpcMetadataSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[67];
      if (field === null && decodeDelta) {
        entity.npc_state = null;
      } else if (field) {
        entity.npc_state = NpcStateSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[68];
      if (field === null && decodeDelta) {
        entity.group_preview_reference = null;
      } else if (field) {
        entity.group_preview_reference =
          GroupPreviewReferenceSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[70];
      if (field === null && decodeDelta) {
        entity.acl_component = null;
      } else if (field) {
        entity.acl_component = AclComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[71];
      if (field === null && decodeDelta) {
        entity.deed_component = null;
      } else if (field) {
        entity.deed_component = DeedComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[72];
      if (field === null && decodeDelta) {
        entity.group_preview_component = null;
      } else if (field) {
        entity.group_preview_component =
          GroupPreviewComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[87];
      if (field === null && decodeDelta) {
        entity.blueprint_component = null;
      } else if (field) {
        entity.blueprint_component = BlueprintComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[74];
      if (field === null && decodeDelta) {
        entity.crafting_station_component = null;
      } else if (field) {
        entity.crafting_station_component =
          CraftingStationComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[75];
      if (field === null && decodeDelta) {
        entity.health = null;
      } else if (field) {
        entity.health = HealthSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[101];
      if (field === null && decodeDelta) {
        entity.buffs_component = null;
      } else if (field) {
        entity.buffs_component = BuffsComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[77];
      if (field === null && decodeDelta) {
        entity.gremlin = null;
      } else if (field) {
        entity.gremlin = GremlinSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[78];
      if (field === null && decodeDelta) {
        entity.placeable_component = null;
      } else if (field) {
        entity.placeable_component = PlaceableComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[83];
      if (field === null && decodeDelta) {
        entity.grouped_entities = null;
      } else if (field) {
        entity.grouped_entities = GroupedEntitiesSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[95];
      if (field === null && decodeDelta) {
        entity.in_group = null;
      } else if (field) {
        entity.in_group = InGroupSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[84];
      if (field === null && decodeDelta) {
        entity.picture_frame_contents = null;
      } else if (field) {
        entity.picture_frame_contents =
          PictureFrameContentsSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[88];
      if (field === null && decodeDelta) {
        entity.trigger_state = null;
      } else if (field) {
        entity.trigger_state = TriggerStateSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[91];
      if (field === null && decodeDelta) {
        entity.lifetime_stats = null;
      } else if (field) {
        entity.lifetime_stats = LifetimeStatsSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[97];
      if (field === null && decodeDelta) {
        entity.occupancy_component = null;
      } else if (field) {
        entity.occupancy_component = OccupancyComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[92];
      if (field === null && decodeDelta) {
        entity.video_component = null;
      } else if (field) {
        entity.video_component = VideoComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[98];
      if (field === null && decodeDelta) {
        entity.player_session = null;
      } else if (field) {
        entity.player_session = PlayerSessionSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[99];
      if (field === null && decodeDelta) {
        entity.preset_applied = null;
      } else if (field) {
        entity.preset_applied = PresetAppliedSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[100];
      if (field === null && decodeDelta) {
        entity.preset_prototype = null;
      } else if (field) {
        entity.preset_prototype = PresetPrototypeSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[102];
      if (field === null && decodeDelta) {
        entity.farming_plant_component = null;
      } else if (field) {
        entity.farming_plant_component =
          FarmingPlantComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[103];
      if (field === null && decodeDelta) {
        entity.shard_farming = null;
      } else if (field) {
        entity.shard_farming = ShardFarmingSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[104];
      if (field === null && decodeDelta) {
        entity.created_by = null;
      } else if (field) {
        entity.created_by = CreatedBySerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[105];
      if (field === null && decodeDelta) {
        entity.minigame_component = null;
      } else if (field) {
        entity.minigame_component = MinigameComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[106];
      if (field === null && decodeDelta) {
        entity.minigame_instance = null;
      } else if (field) {
        entity.minigame_instance = MinigameInstanceSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[107];
      if (field === null && decodeDelta) {
        entity.playing_minigame = null;
      } else if (field) {
        entity.playing_minigame = PlayingMinigameSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[108];
      if (field === null && decodeDelta) {
        entity.minigame_element = null;
      } else if (field) {
        entity.minigame_element = MinigameElementSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[109];
      if (field === null && decodeDelta) {
        entity.active_tray = null;
      } else if (field) {
        entity.active_tray = ActiveTraySerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[115];
      if (field === null && decodeDelta) {
        entity.stashed = null;
      } else if (field) {
        entity.stashed = StashedSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[117];
      if (field === null && decodeDelta) {
        entity.minigame_instance_tick_info = null;
      } else if (field) {
        entity.minigame_instance_tick_info =
          MinigameInstanceTickInfoSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[118];
      if (field === null && decodeDelta) {
        entity.warping_to = null;
      } else if (field) {
        entity.warping_to = WarpingToSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[119];
      if (field === null && decodeDelta) {
        entity.minigame_instance_expire = null;
      } else if (field) {
        entity.minigame_instance_expire =
          MinigameInstanceExpireSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[121];
      if (field === null && decodeDelta) {
        entity.placer_component = null;
      } else if (field) {
        entity.placer_component = PlacerComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[122];
      if (field === null && decodeDelta) {
        entity.quest_giver = null;
      } else if (field) {
        entity.quest_giver = QuestGiverSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[123];
      if (field === null && decodeDelta) {
        entity.default_dialog = null;
      } else if (field) {
        entity.default_dialog = DefaultDialogSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[125];
      if (field === null && decodeDelta) {
        entity.unmuck = null;
      } else if (field) {
        entity.unmuck = UnmuckSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[126];
      if (field === null && decodeDelta) {
        entity.robot_component = null;
      } else if (field) {
        entity.robot_component = RobotComponentSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[140];
      if (field === null && decodeDelta) {
        entity.admin_entity = null;
      } else if (field) {
        entity.admin_entity = AdminEntitySerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[127];
      if (field === null && decodeDelta) {
        entity.protection = null;
      } else if (field) {
        entity.protection = ProtectionSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[128];
      if (field === null && decodeDelta) {
        entity.projects_protection = null;
      } else if (field) {
        entity.projects_protection = ProjectsProtectionSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[129];
      if (field === null && decodeDelta) {
        entity.deletes_with = null;
      } else if (field) {
        entity.deletes_with = DeletesWithSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[130];
      if (field === null && decodeDelta) {
        entity.item_buyer = null;
      } else if (field) {
        entity.item_buyer = ItemBuyerSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[131];
      if (field === null && decodeDelta) {
        entity.inspection_tweaks = null;
      } else if (field) {
        entity.inspection_tweaks = InspectionTweaksSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[132];
      if (field === null && decodeDelta) {
        entity.profile_pic = null;
      } else if (field) {
        entity.profile_pic = ProfilePicSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[133];
      if (field === null && decodeDelta) {
        entity.entity_description = null;
      } else if (field) {
        entity.entity_description = EntityDescriptionSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[134];
      if (field === null && decodeDelta) {
        entity.landmark = null;
      } else if (field) {
        entity.landmark = LandmarkSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[135];
      if (field === null && decodeDelta) {
        entity.collideable = null;
      } else if (field) {
        entity.collideable = CollideableSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[136];
      if (field === null && decodeDelta) {
        entity.restoration = null;
      } else if (field) {
        entity.restoration = RestorationSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[137];
      if (field === null && decodeDelta) {
        entity.terrain_restoration_diff = null;
      } else if (field) {
        entity.terrain_restoration_diff =
          TerrainRestorationDiffSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[138];
      if (field === null && decodeDelta) {
        entity.team = null;
      } else if (field) {
        entity.team = TeamSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[139];
      if (field === null && decodeDelta) {
        entity.player_current_team = null;
      } else if (field) {
        entity.player_current_team = PlayerCurrentTeamSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[141];
      if (field === null && decodeDelta) {
        entity.user_roles = null;
      } else if (field) {
        entity.user_roles = UserRolesSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[142];
      if (field === null && decodeDelta) {
        entity.restores_to = null;
      } else if (field) {
        entity.restores_to = RestoresToSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[143];
      if (field === null && decodeDelta) {
        entity.trade = null;
      } else if (field) {
        entity.trade = TradeSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[144];
      if (field === null && decodeDelta) {
        entity.active_trades = null;
      } else if (field) {
        entity.active_trades = ActiveTradesSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[145];
      if (field === null && decodeDelta) {
        entity.placed_by = null;
      } else if (field) {
        entity.placed_by = PlacedBySerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[146];
      if (field === null && decodeDelta) {
        entity.text_sign = null;
      } else if (field) {
        entity.text_sign = TextSignSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[147];
      if (field === null && decodeDelta) {
        entity.irradiance = null;
      } else if (field) {
        entity.irradiance = IrradianceSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[148];
      if (field === null && decodeDelta) {
        entity.locked_in_place = null;
      } else if (field) {
        entity.locked_in_place = LockedInPlaceSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[149];
      if (field === null && decodeDelta) {
        entity.death_info = null;
      } else if (field) {
        entity.death_info = DeathInfoSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[150];
      if (field === null && decodeDelta) {
        entity.synthetic_stats = null;
      } else if (field) {
        entity.synthetic_stats = SyntheticStatsSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[151];
      if (field === null && decodeDelta) {
        entity.idle = null;
      } else if (field) {
        entity.idle = IdleSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[152];
      if (field === null && decodeDelta) {
        entity.voice = null;
      } else if (field) {
        entity.voice = VoiceSerde.deserialize(field);
      }
    }
    {
      const field = (entityData as any)[153];
      if (field === null && decodeDelta) {
        entity.gift_giver = null;
      } else if (field) {
        entity.gift_giver = GiftGiverSerde.deserialize(field);
      }
    }
    return entity as e.Entity;
  }
}

class DisconnectPlayerEventSerde {
  static serialize(event: ev.DisconnectPlayerEvent) {
    return {
      kind: "disconnectPlayerEvent",
      id: t.serializeBiomesId(event.id),
    };
  }

  static deserialize(data: any) {
    return new ev.DisconnectPlayerEvent({
      id: t.deserializeBiomesId(data.id),
    });
  }
}
class MoveEventSerde {
  static serialize(event: ev.MoveEvent) {
    return {
      kind: "moveEvent",
      id: t.serializeBiomesId(event.id),
      position: event.position,
      velocity: event.velocity,
      orientation: event.orientation,
    };
  }

  static deserialize(data: any) {
    return new ev.MoveEvent({
      id: t.deserializeBiomesId(data.id),
      position: t.deserializeOptionalVec3f(data.position),
      velocity: t.deserializeOptionalVec3f(data.velocity),
      orientation: t.deserializeOptionalVec2f(data.orientation),
    });
  }
}
class IdleChangeEventSerde {
  static serialize(event: ev.IdleChangeEvent) {
    return {
      kind: "idleChangeEvent",
      id: t.serializeBiomesId(event.id),
      idle: event.idle,
    };
  }

  static deserialize(data: any) {
    return new ev.IdleChangeEvent({
      id: t.deserializeBiomesId(data.id),
      idle: t.deserializeBool(data.idle),
    });
  }
}
class EnterRobotFieldEventSerde {
  static serialize(event: ev.EnterRobotFieldEvent) {
    return {
      kind: "enterRobotFieldEvent",
      id: t.serializeBiomesId(event.id),
      robot_id: t.serializeBiomesId(event.robot_id),
    };
  }

  static deserialize(data: any) {
    return new ev.EnterRobotFieldEvent({
      id: t.deserializeBiomesId(data.id),
      robot_id: t.deserializeBiomesId(data.robot_id),
    });
  }
}
class WarpEventSerde {
  static serialize(event: ev.WarpEvent) {
    return {
      kind: "warpEvent",
      id: t.serializeBiomesId(event.id),
      position: event.position,
      orientation: event.orientation,
      cost: t.serializeU64(event.cost),
      royalty: t.serializeU64(event.royalty),
      royaltyTarget: t.serializeOptionalBiomesId(event.royaltyTarget),
    };
  }

  static deserialize(data: any) {
    return new ev.WarpEvent({
      id: t.deserializeBiomesId(data.id),
      position: t.deserializeVec3f(data.position),
      orientation: t.deserializeOptionalVec2f(data.orientation),
      cost: t.deserializeU64(data.cost),
      royalty: t.deserializeU64(data.royalty),
      royaltyTarget: t.deserializeOptionalBiomesId(data.royaltyTarget),
    });
  }
}
class WarpHomeEventSerde {
  static serialize(event: ev.WarpHomeEvent) {
    return {
      kind: "warpHomeEvent",
      id: t.serializeBiomesId(event.id),
      position: event.position,
      orientation: event.orientation,
      reason: event.reason,
    };
  }

  static deserialize(data: any) {
    return new ev.WarpHomeEvent({
      id: t.deserializeBiomesId(data.id),
      position: t.deserializeVec3f(data.position),
      orientation: t.deserializeVec2f(data.orientation),
      reason: t.deserializeWarpHomeReason(data.reason),
    });
  }
}
class EditEventSerde {
  static serialize(event: ev.EditEvent) {
    return {
      kind: "editEvent",
      id: t.serializeBiomesId(event.id),
      position: event.position,
      value: event.value,
      user_id: t.serializeBiomesId(event.user_id),
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
      blueprint_entity_id: t.serializeOptionalBiomesId(
        event.blueprint_entity_id
      ),
      blueprint_completed: event.blueprint_completed,
    };
  }

  static deserialize(data: any) {
    return new ev.EditEvent({
      id: t.deserializeBiomesId(data.id),
      position: t.deserializeVec3i(data.position),
      value: t.deserializeU32(data.value),
      user_id: t.deserializeBiomesId(data.user_id),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
      blueprint_entity_id: t.deserializeOptionalBiomesId(
        data.blueprint_entity_id
      ),
      blueprint_completed: t.deserializeOptionalBool(data.blueprint_completed),
    });
  }
}
class ShapeEventSerde {
  static serialize(event: ev.ShapeEvent) {
    return {
      kind: "shapeEvent",
      id: t.serializeBiomesId(event.id),
      position: event.position,
      isomorphism: event.isomorphism,
      user_id: t.serializeBiomesId(event.user_id),
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
      blueprint_entity_id: t.serializeOptionalBiomesId(
        event.blueprint_entity_id
      ),
      blueprint_completed: event.blueprint_completed,
    };
  }

  static deserialize(data: any) {
    return new ev.ShapeEvent({
      id: t.deserializeBiomesId(data.id),
      position: t.deserializeVec3i(data.position),
      isomorphism: t.deserializeU32(data.isomorphism),
      user_id: t.deserializeBiomesId(data.user_id),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
      blueprint_entity_id: t.deserializeOptionalBiomesId(
        data.blueprint_entity_id
      ),
      blueprint_completed: t.deserializeOptionalBool(data.blueprint_completed),
    });
  }
}
class FarmingEventSerde {
  static serialize(event: ev.FarmingEvent) {
    return {
      kind: "farmingEvent",
      id: t.serializeBiomesId(event.id),
      updates: event.updates,
    };
  }

  static deserialize(data: any) {
    return new ev.FarmingEvent({
      id: t.deserializeBiomesId(data.id),
      updates: t.deserializeTerrainUpdateList(data.updates),
    });
  }
}
class DumpWaterEventSerde {
  static serialize(event: ev.DumpWaterEvent) {
    return {
      kind: "dumpWaterEvent",
      id: t.serializeBiomesId(event.id),
      pos: event.pos,
    };
  }

  static deserialize(data: any) {
    return new ev.DumpWaterEvent({
      id: t.deserializeBiomesId(data.id),
      pos: t.deserializeVec3i(data.pos),
    });
  }
}
class ScoopWaterEventSerde {
  static serialize(event: ev.ScoopWaterEvent) {
    return {
      kind: "scoopWaterEvent",
      id: t.serializeBiomesId(event.id),
      pos: event.pos,
    };
  }

  static deserialize(data: any) {
    return new ev.ScoopWaterEvent({
      id: t.deserializeBiomesId(data.id),
      pos: t.deserializeVec3i(data.pos),
    });
  }
}
class InventoryCombineEventSerde {
  static serialize(event: ev.InventoryCombineEvent) {
    return {
      kind: "inventoryCombineEvent",
      player_id: t.serializeBiomesId(event.player_id),
      src_id: t.serializeBiomesId(event.src_id),
      src: t.serializeOwnedItemReference(event.src),
      dst_id: t.serializeOptionalBiomesId(event.dst_id),
      dst: t.serializeOwnedItemReference(event.dst),
      count: t.serializeU64(event.count),
      positions: event.positions,
    };
  }

  static deserialize(data: any) {
    return new ev.InventoryCombineEvent({
      player_id: t.deserializeBiomesId(data.player_id),
      src_id: t.deserializeBiomesId(data.src_id),
      src: t.deserializeOwnedItemReference(data.src),
      dst_id: t.deserializeOptionalBiomesId(data.dst_id),
      dst: t.deserializeOwnedItemReference(data.dst),
      count: t.deserializeU64(data.count),
      positions: t.deserializeVec3iList(data.positions),
    });
  }
}
class InventorySplitEventSerde {
  static serialize(event: ev.InventorySplitEvent) {
    return {
      kind: "inventorySplitEvent",
      player_id: t.serializeBiomesId(event.player_id),
      src_id: t.serializeBiomesId(event.src_id),
      src: t.serializeOwnedItemReference(event.src),
      dst_id: t.serializeOptionalBiomesId(event.dst_id),
      dst: t.serializeOwnedItemReference(event.dst),
      count: t.serializeU64(event.count),
      positions: event.positions,
    };
  }

  static deserialize(data: any) {
    return new ev.InventorySplitEvent({
      player_id: t.deserializeBiomesId(data.player_id),
      src_id: t.deserializeBiomesId(data.src_id),
      src: t.deserializeOwnedItemReference(data.src),
      dst_id: t.deserializeOptionalBiomesId(data.dst_id),
      dst: t.deserializeOwnedItemReference(data.dst),
      count: t.deserializeU64(data.count),
      positions: t.deserializeVec3iList(data.positions),
    });
  }
}
class InventorySortEventSerde {
  static serialize(event: ev.InventorySortEvent) {
    return {
      kind: "inventorySortEvent",
      id: t.serializeBiomesId(event.id),
    };
  }

  static deserialize(data: any) {
    return new ev.InventorySortEvent({
      id: t.deserializeBiomesId(data.id),
    });
  }
}
class InventorySwapEventSerde {
  static serialize(event: ev.InventorySwapEvent) {
    return {
      kind: "inventorySwapEvent",
      player_id: t.serializeBiomesId(event.player_id),
      src_id: t.serializeBiomesId(event.src_id),
      src: t.serializeOwnedItemReference(event.src),
      dst_id: t.serializeOptionalBiomesId(event.dst_id),
      dst: t.serializeOwnedItemReference(event.dst),
      positions: event.positions,
    };
  }

  static deserialize(data: any) {
    return new ev.InventorySwapEvent({
      player_id: t.deserializeBiomesId(data.player_id),
      src_id: t.deserializeBiomesId(data.src_id),
      src: t.deserializeOwnedItemReference(data.src),
      dst_id: t.deserializeOptionalBiomesId(data.dst_id),
      dst: t.deserializeOwnedItemReference(data.dst),
      positions: t.deserializeVec3iList(data.positions),
    });
  }
}
class RobotInventorySwapEventSerde {
  static serialize(event: ev.RobotInventorySwapEvent) {
    return {
      kind: "robotInventorySwapEvent",
      id: t.serializeBiomesId(event.id),
      src: t.serializeOwnedItemReference(event.src),
      dst: t.serializeOwnedItemReference(event.dst),
      dst_id: t.serializeBiomesId(event.dst_id),
    };
  }

  static deserialize(data: any) {
    return new ev.RobotInventorySwapEvent({
      id: t.deserializeBiomesId(data.id),
      src: t.deserializeOwnedItemReference(data.src),
      dst: t.deserializeOwnedItemReference(data.dst),
      dst_id: t.deserializeBiomesId(data.dst_id),
    });
  }
}
class InventoryThrowEventSerde {
  static serialize(event: ev.InventoryThrowEvent) {
    return {
      kind: "inventoryThrowEvent",
      id: t.serializeBiomesId(event.id),
      src: t.serializeOwnedItemReference(event.src),
      count: t.serializeOptionalU64(event.count),
      position: event.position,
    };
  }

  static deserialize(data: any) {
    return new ev.InventoryThrowEvent({
      id: t.deserializeBiomesId(data.id),
      src: t.deserializeOwnedItemReference(data.src),
      count: t.deserializeOptionalU64(data.count),
      position: t.deserializeVec3f(data.position),
    });
  }
}
class InventoryDestroyEventSerde {
  static serialize(event: ev.InventoryDestroyEvent) {
    return {
      kind: "inventoryDestroyEvent",
      id: t.serializeBiomesId(event.id),
      src: t.serializeOwnedItemReference(event.src),
      count: t.serializeOptionalU64(event.count),
    };
  }

  static deserialize(data: any) {
    return new ev.InventoryDestroyEvent({
      id: t.deserializeBiomesId(data.id),
      src: t.deserializeOwnedItemReference(data.src),
      count: t.deserializeOptionalU64(data.count),
    });
  }
}
class DyeBlockEventSerde {
  static serialize(event: ev.DyeBlockEvent) {
    return {
      kind: "dyeBlockEvent",
      id: t.serializeBiomesId(event.id),
      dye: event.dye,
      position: event.position,
      user_id: t.serializeBiomesId(event.user_id),
    };
  }

  static deserialize(data: any) {
    return new ev.DyeBlockEvent({
      id: t.deserializeBiomesId(data.id),
      dye: t.deserializeU8(data.dye),
      position: t.deserializeVec3i(data.position),
      user_id: t.deserializeBiomesId(data.user_id),
    });
  }
}
class UnmuckerEventSerde {
  static serialize(event: ev.UnmuckerEvent) {
    return {
      kind: "unmuckerEvent",
      id: t.serializeBiomesId(event.id),
      unmucker: event.unmucker,
    };
  }

  static deserialize(data: any) {
    return new ev.UnmuckerEvent({
      id: t.deserializeBiomesId(data.id),
      unmucker: t.deserializeOptionalBool(data.unmucker),
    });
  }
}
class InternalInventorySetEventSerde {
  static serialize(event: ev.InternalInventorySetEvent) {
    return {
      kind: "internalInventorySetEvent",
      id: t.serializeBiomesId(event.id),
      dst: t.serializeOwnedItemReference(event.dst),
      item: t.serializeOptionalItemAndCount(event.item),
    };
  }

  static deserialize(data: any) {
    return new ev.InternalInventorySetEvent({
      id: t.deserializeBiomesId(data.id),
      dst: t.deserializeOwnedItemReference(data.dst),
      item: t.deserializeOptionalItemAndCount(data.item),
    });
  }
}
class InventoryCraftEventSerde {
  static serialize(event: ev.InventoryCraftEvent) {
    return {
      kind: "inventoryCraftEvent",
      id: t.serializeBiomesId(event.id),
      recipe: t.serializeItem(event.recipe),
      slot_refs: t.serializeOwnedItemReferenceList(event.slot_refs),
      stationEntityId: t.serializeBiomesId(event.stationEntityId),
    };
  }

  static deserialize(data: any) {
    return new ev.InventoryCraftEvent({
      id: t.deserializeBiomesId(data.id),
      recipe: t.deserializeItem(data.recipe),
      slot_refs: t.deserializeOwnedItemReferenceList(data.slot_refs),
      stationEntityId: t.deserializeBiomesId(data.stationEntityId),
    });
  }
}
class InventoryDyeEventSerde {
  static serialize(event: ev.InventoryDyeEvent) {
    return {
      kind: "inventoryDyeEvent",
      id: t.serializeBiomesId(event.id),
      src: t.serializeOwnedItemReference(event.src),
      dst: t.serializeOwnedItemReference(event.dst),
    };
  }

  static deserialize(data: any) {
    return new ev.InventoryDyeEvent({
      id: t.deserializeBiomesId(data.id),
      src: t.deserializeOwnedItemReference(data.src),
      dst: t.deserializeOwnedItemReference(data.dst),
    });
  }
}
class InventoryCookEventSerde {
  static serialize(event: ev.InventoryCookEvent) {
    return {
      kind: "inventoryCookEvent",
      id: t.serializeBiomesId(event.id),
      src: t.serializeInventoryAssignmentPattern(event.src),
      stationEntityId: t.serializeBiomesId(event.stationEntityId),
    };
  }

  static deserialize(data: any) {
    return new ev.InventoryCookEvent({
      id: t.deserializeBiomesId(data.id),
      src: t.deserializeInventoryAssignmentPattern(data.src),
      stationEntityId: t.deserializeBiomesId(data.stationEntityId),
    });
  }
}
class InventoryCompostEventSerde {
  static serialize(event: ev.InventoryCompostEvent) {
    return {
      kind: "inventoryCompostEvent",
      id: t.serializeBiomesId(event.id),
      src: t.serializeInventoryAssignmentPattern(event.src),
      stationEntityId: t.serializeBiomesId(event.stationEntityId),
    };
  }

  static deserialize(data: any) {
    return new ev.InventoryCompostEvent({
      id: t.deserializeBiomesId(data.id),
      src: t.deserializeInventoryAssignmentPattern(data.src),
      stationEntityId: t.deserializeBiomesId(data.stationEntityId),
    });
  }
}
class InventoryChangeSelectionEventSerde {
  static serialize(event: ev.InventoryChangeSelectionEvent) {
    return {
      kind: "inventoryChangeSelectionEvent",
      id: t.serializeBiomesId(event.id),
      ref: t.serializeOwnedItemReference(event.ref),
    };
  }

  static deserialize(data: any) {
    return new ev.InventoryChangeSelectionEvent({
      id: t.deserializeBiomesId(data.id),
      ref: t.deserializeOwnedItemReference(data.ref),
    });
  }
}
class ChangeCameraModeEventSerde {
  static serialize(event: ev.ChangeCameraModeEvent) {
    return {
      kind: "changeCameraModeEvent",
      id: t.serializeBiomesId(event.id),
      mode: event.mode,
    };
  }

  static deserialize(data: any) {
    return new ev.ChangeCameraModeEvent({
      id: t.deserializeBiomesId(data.id),
      mode: t.deserializeCameraMode(data.mode),
    });
  }
}
class OverflowMoveToInventoryEventSerde {
  static serialize(event: ev.OverflowMoveToInventoryEvent) {
    return {
      kind: "overflowMoveToInventoryEvent",
      id: t.serializeBiomesId(event.id),
      payload: t.serializeItemBag(event.payload),
      dst: t.serializeOptionalOwnedItemReference(event.dst),
    };
  }

  static deserialize(data: any) {
    return new ev.OverflowMoveToInventoryEvent({
      id: t.deserializeBiomesId(data.id),
      payload: t.deserializeItemBag(data.payload),
      dst: t.deserializeOptionalOwnedItemReference(data.dst),
    });
  }
}
class InventoryMoveToOverflowEventSerde {
  static serialize(event: ev.InventoryMoveToOverflowEvent) {
    return {
      kind: "inventoryMoveToOverflowEvent",
      id: t.serializeBiomesId(event.id),
      src: t.serializeOwnedItemReference(event.src),
      count: t.serializeU64(event.count),
    };
  }

  static deserialize(data: any) {
    return new ev.InventoryMoveToOverflowEvent({
      id: t.deserializeBiomesId(data.id),
      src: t.deserializeOwnedItemReference(data.src),
      count: t.deserializeU64(data.count),
    });
  }
}
class AppearanceChangeEventSerde {
  static serialize(event: ev.AppearanceChangeEvent) {
    return {
      kind: "appearanceChangeEvent",
      id: t.serializeBiomesId(event.id),
      appearance: t.serializeAppearance(event.appearance),
    };
  }

  static deserialize(data: any) {
    return new ev.AppearanceChangeEvent({
      id: t.deserializeBiomesId(data.id),
      appearance: t.deserializeAppearance(data.appearance),
    });
  }
}
class HairTransplantEventSerde {
  static serialize(event: ev.HairTransplantEvent) {
    return {
      kind: "hairTransplantEvent",
      id: t.serializeBiomesId(event.id),
      newHairId: t.serializeOptionalBiomesId(event.newHairId),
    };
  }

  static deserialize(data: any) {
    return new ev.HairTransplantEvent({
      id: t.deserializeBiomesId(data.id),
      newHairId: t.deserializeOptionalBiomesId(data.newHairId),
    });
  }
}
class EmoteEventSerde {
  static serialize(event: ev.EmoteEvent) {
    return {
      kind: "emoteEvent",
      id: t.serializeBiomesId(event.id),
      emote_type: event.emote_type,
      nonce: event.nonce,
      rich_emote_components: t.serializeOptionalRichEmoteComponents(
        event.rich_emote_components
      ),
      start_time: event.start_time,
      expiry_time: event.expiry_time,
    };
  }

  static deserialize(data: any) {
    return new ev.EmoteEvent({
      id: t.deserializeBiomesId(data.id),
      emote_type: t.deserializeOptionalEmoteType(data.emote_type),
      nonce: t.deserializeOptionalF64(data.nonce),
      rich_emote_components: t.deserializeOptionalRichEmoteComponents(
        data.rich_emote_components
      ),
      start_time: t.deserializeOptionalF64(data.start_time),
      expiry_time: t.deserializeOptionalF64(data.expiry_time),
    });
  }
}
class StartPlaceableAnimationEventSerde {
  static serialize(event: ev.StartPlaceableAnimationEvent) {
    return {
      kind: "startPlaceableAnimationEvent",
      id: t.serializeBiomesId(event.id),
      animation_type: event.animation_type,
    };
  }

  static deserialize(data: any) {
    return new ev.StartPlaceableAnimationEvent({
      id: t.deserializeBiomesId(data.id),
      animation_type: t.deserializePlaceableAnimationType(data.animation_type),
    });
  }
}
class PlacePlaceableEventSerde {
  static serialize(event: ev.PlacePlaceableEvent) {
    return {
      kind: "placePlaceableEvent",
      id: t.serializeBiomesId(event.id),
      placeable_item: t.serializeItem(event.placeable_item),
      inventory_item: t.serializeItem(event.inventory_item),
      inventory_ref: t.serializeOwnedItemReference(event.inventory_ref),
      position: event.position,
      orientation: event.orientation,
      minigame_id: t.serializeOptionalBiomesId(event.minigame_id),
      existing_placeable: t.serializeOptionalBiomesId(event.existing_placeable),
    };
  }

  static deserialize(data: any) {
    return new ev.PlacePlaceableEvent({
      id: t.deserializeBiomesId(data.id),
      placeable_item: t.deserializeItem(data.placeable_item),
      inventory_item: t.deserializeItem(data.inventory_item),
      inventory_ref: t.deserializeOwnedItemReference(data.inventory_ref),
      position: t.deserializeVec3f(data.position),
      orientation: t.deserializeVec2f(data.orientation),
      minigame_id: t.deserializeOptionalBiomesId(data.minigame_id),
      existing_placeable: t.deserializeOptionalBiomesId(
        data.existing_placeable
      ),
    });
  }
}
class DestroyPlaceableEventSerde {
  static serialize(event: ev.DestroyPlaceableEvent) {
    return {
      kind: "destroyPlaceableEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
      expired: event.expired,
    };
  }

  static deserialize(data: any) {
    return new ev.DestroyPlaceableEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
      expired: t.deserializeOptionalBool(data.expired),
    });
  }
}
class ChangePictureFrameContentsEventSerde {
  static serialize(event: ev.ChangePictureFrameContentsEvent) {
    return {
      kind: "changePictureFrameContentsEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      photo_id: t.serializeOptionalBiomesId(event.photo_id),
      minigame_id: t.serializeOptionalBiomesId(event.minigame_id),
    };
  }

  static deserialize(data: any) {
    return new ev.ChangePictureFrameContentsEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      photo_id: t.deserializeOptionalBiomesId(data.photo_id),
      minigame_id: t.deserializeOptionalBiomesId(data.minigame_id),
    });
  }
}
class ChangeTextSignContentsEventSerde {
  static serialize(event: ev.ChangeTextSignContentsEvent) {
    return {
      kind: "changeTextSignContentsEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      text: event.text,
    };
  }

  static deserialize(data: any) {
    return new ev.ChangeTextSignContentsEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      text: t.deserializeStrings(data.text),
    });
  }
}
class UpdateVideoSettingsEventSerde {
  static serialize(event: ev.UpdateVideoSettingsEvent) {
    return {
      kind: "updateVideoSettingsEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      video_url: event.video_url,
      muted: event.muted,
    };
  }

  static deserialize(data: any) {
    return new ev.UpdateVideoSettingsEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      video_url: t.deserializeOptionalString(data.video_url),
      muted: t.deserializeBool(data.muted),
    });
  }
}
class SellInContainerEventSerde {
  static serialize(event: ev.SellInContainerEvent) {
    return {
      kind: "sellInContainerEvent",
      id: t.serializeBiomesId(event.id),
      seller_id: t.serializeBiomesId(event.seller_id),
      src: t.serializeOwnedItemReference(event.src),
      sell_item: t.serializeItemAndCount(event.sell_item),
      dst_slot: t.serializeOwnedItemReference(event.dst_slot),
      dst_price: t.serializeItemAndCount(event.dst_price),
    };
  }

  static deserialize(data: any) {
    return new ev.SellInContainerEvent({
      id: t.deserializeBiomesId(data.id),
      seller_id: t.deserializeBiomesId(data.seller_id),
      src: t.deserializeOwnedItemReference(data.src),
      sell_item: t.deserializeItemAndCount(data.sell_item),
      dst_slot: t.deserializeOwnedItemReference(data.dst_slot),
      dst_price: t.deserializeItemAndCount(data.dst_price),
    });
  }
}
class PurchaseFromContainerEventSerde {
  static serialize(event: ev.PurchaseFromContainerEvent) {
    return {
      kind: "purchaseFromContainerEvent",
      id: t.serializeBiomesId(event.id),
      purchaser_id: t.serializeBiomesId(event.purchaser_id),
      seller_id: t.serializeBiomesId(event.seller_id),
      src: t.serializeOwnedItemReference(event.src),
      quantity: event.quantity,
    };
  }

  static deserialize(data: any) {
    return new ev.PurchaseFromContainerEvent({
      id: t.deserializeBiomesId(data.id),
      purchaser_id: t.deserializeBiomesId(data.purchaser_id),
      seller_id: t.deserializeBiomesId(data.seller_id),
      src: t.deserializeOwnedItemReference(data.src),
      quantity: t.deserializeOptionalU32(data.quantity),
    });
  }
}
class UpdateRobotNameEventSerde {
  static serialize(event: ev.UpdateRobotNameEvent) {
    return {
      kind: "updateRobotNameEvent",
      id: t.serializeBiomesId(event.id),
      player_id: t.serializeBiomesId(event.player_id),
      entity_id: t.serializeBiomesId(event.entity_id),
      name: event.name,
    };
  }

  static deserialize(data: any) {
    return new ev.UpdateRobotNameEvent({
      id: t.deserializeBiomesId(data.id),
      player_id: t.deserializeBiomesId(data.player_id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      name: t.deserializeString(data.name),
    });
  }
}
class PlaceRobotEventSerde {
  static serialize(event: ev.PlaceRobotEvent) {
    return {
      kind: "placeRobotEvent",
      id: t.serializeBiomesId(event.id),
      robot_entity_id: t.serializeOptionalBiomesId(event.robot_entity_id),
      inventory_ref: t.serializeOwnedItemReference(event.inventory_ref),
      position: event.position,
      orientation: event.orientation,
      item_id: t.serializeBiomesId(event.item_id),
    };
  }

  static deserialize(data: any) {
    return new ev.PlaceRobotEvent({
      id: t.deserializeBiomesId(data.id),
      robot_entity_id: t.deserializeOptionalBiomesId(data.robot_entity_id),
      inventory_ref: t.deserializeOwnedItemReference(data.inventory_ref),
      position: t.deserializeVec3f(data.position),
      orientation: t.deserializeVec2f(data.orientation),
      item_id: t.deserializeBiomesId(data.item_id),
    });
  }
}
class EndPlaceRobotEventSerde {
  static serialize(event: ev.EndPlaceRobotEvent) {
    return {
      kind: "endPlaceRobotEvent",
      id: t.serializeBiomesId(event.id),
      robot_entity_id: t.serializeBiomesId(event.robot_entity_id),
      position: event.position,
      orientation: event.orientation,
    };
  }

  static deserialize(data: any) {
    return new ev.EndPlaceRobotEvent({
      id: t.deserializeBiomesId(data.id),
      robot_entity_id: t.deserializeBiomesId(data.robot_entity_id),
      position: t.deserializeVec3f(data.position),
      orientation: t.deserializeVec2f(data.orientation),
    });
  }
}
class PickUpRobotEventSerde {
  static serialize(event: ev.PickUpRobotEvent) {
    return {
      kind: "pickUpRobotEvent",
      id: t.serializeBiomesId(event.id),
      player_id: t.serializeBiomesId(event.player_id),
      entity_id: t.serializeBiomesId(event.entity_id),
    };
  }

  static deserialize(data: any) {
    return new ev.PickUpRobotEvent({
      id: t.deserializeBiomesId(data.id),
      player_id: t.deserializeBiomesId(data.player_id),
      entity_id: t.deserializeBiomesId(data.entity_id),
    });
  }
}
class UpdateProjectedRestorationEventSerde {
  static serialize(event: ev.UpdateProjectedRestorationEvent) {
    return {
      kind: "updateProjectedRestorationEvent",
      id: t.serializeBiomesId(event.id),
      player_id: t.serializeBiomesId(event.player_id),
      entity_id: t.serializeBiomesId(event.entity_id),
      restore_delay_s: event.restore_delay_s,
    };
  }

  static deserialize(data: any) {
    return new ev.UpdateProjectedRestorationEvent({
      id: t.deserializeBiomesId(data.id),
      player_id: t.deserializeBiomesId(data.player_id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      restore_delay_s: t.deserializeOptionalF64(data.restore_delay_s),
    });
  }
}
class LabelChangeEventSerde {
  static serialize(event: ev.LabelChangeEvent) {
    return {
      kind: "labelChangeEvent",
      id: t.serializeBiomesId(event.id),
      text: event.text,
    };
  }

  static deserialize(data: any) {
    return new ev.LabelChangeEvent({
      id: t.deserializeBiomesId(data.id),
      text: t.deserializeString(data.text),
    });
  }
}
class CreateGroupEventSerde {
  static serialize(event: ev.CreateGroupEvent) {
    return {
      kind: "createGroupEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      name: event.name,
      warp: event.warp,
      tensor: event.tensor,
      box: event.box,
      placeable_ids: t.serializeBiomesIdList(event.placeable_ids),
      position: event.position,
    };
  }

  static deserialize(data: any) {
    return new ev.CreateGroupEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      name: t.deserializeString(data.name),
      warp: t.deserializeOptionalWarpTarget(data.warp),
      tensor: t.deserializeTensorBlob(data.tensor),
      box: t.deserializeBox2(data.box),
      placeable_ids: t.deserializeBiomesIdList(data.placeable_ids),
      position: t.deserializeVec3f(data.position),
    });
  }
}
class PlaceBlueprintEventSerde {
  static serialize(event: ev.PlaceBlueprintEvent) {
    return {
      kind: "placeBlueprintEvent",
      id: t.serializeBiomesId(event.id),
      inventory_ref: t.serializeOwnedItemReference(event.inventory_ref),
      item: t.serializeBiomesId(event.item),
      position: event.position,
      orientation: event.orientation,
    };
  }

  static deserialize(data: any) {
    return new ev.PlaceBlueprintEvent({
      id: t.deserializeBiomesId(data.id),
      inventory_ref: t.deserializeOwnedItemReference(data.inventory_ref),
      item: t.deserializeBiomesId(data.item),
      position: t.deserializeVec3f(data.position),
      orientation: t.deserializeVec2f(data.orientation),
    });
  }
}
class DestroyBlueprintEventSerde {
  static serialize(event: ev.DestroyBlueprintEvent) {
    return {
      kind: "destroyBlueprintEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
      position: event.position,
    };
  }

  static deserialize(data: any) {
    return new ev.DestroyBlueprintEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
      position: t.deserializeVec3f(data.position),
    });
  }
}
class CreateCraftingStationEventSerde {
  static serialize(event: ev.CreateCraftingStationEvent) {
    return {
      kind: "createCraftingStationEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
    };
  }

  static deserialize(data: any) {
    return new ev.CreateCraftingStationEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
    });
  }
}
class FeedRobotEventSerde {
  static serialize(event: ev.FeedRobotEvent) {
    return {
      kind: "feedRobotEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      amount: t.serializeU64(event.amount),
    };
  }

  static deserialize(data: any) {
    return new ev.FeedRobotEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      amount: t.deserializeU64(data.amount),
    });
  }
}
class PlaceGroupEventSerde {
  static serialize(event: ev.PlaceGroupEvent) {
    return {
      kind: "placeGroupEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      inventory_ref: t.serializeOwnedItemReference(event.inventory_ref),
      warp: event.warp,
      box: event.box,
      rotation: event.rotation,
      reflection: event.reflection,
      tensor: event.tensor,
      name: event.name,
    };
  }

  static deserialize(data: any) {
    return new ev.PlaceGroupEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      inventory_ref: t.deserializeOwnedItemReference(data.inventory_ref),
      warp: t.deserializeWarpTarget(data.warp),
      box: t.deserializeBox2(data.box),
      rotation: t.deserializeOptionalU32(data.rotation),
      reflection: t.deserializeOptionalVec3f(data.reflection),
      tensor: t.deserializeTensorBlob(data.tensor),
      name: t.deserializeString(data.name),
    });
  }
}
class CloneGroupEventSerde {
  static serialize(event: ev.CloneGroupEvent) {
    return {
      kind: "cloneGroupEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      inventory_ref: t.serializeOwnedItemReference(event.inventory_ref),
      box: event.box,
      rotation: event.rotation,
      reflection: event.reflection,
      tensor: event.tensor,
    };
  }

  static deserialize(data: any) {
    return new ev.CloneGroupEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      inventory_ref: t.deserializeOwnedItemReference(data.inventory_ref),
      box: t.deserializeBox2(data.box),
      rotation: t.deserializeOptionalU32(data.rotation),
      reflection: t.deserializeOptionalVec3f(data.reflection),
      tensor: t.deserializeTensorBlob(data.tensor),
    });
  }
}
class DestroyGroupEventSerde {
  static serialize(event: ev.DestroyGroupEvent) {
    return {
      kind: "destroyGroupEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      position: event.position,
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
      rotation: event.rotation,
      placeable_ids: t.serializeBiomesIdList(event.placeable_ids),
    };
  }

  static deserialize(data: any) {
    return new ev.DestroyGroupEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      position: t.deserializeVec3f(data.position),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
      rotation: t.deserializeOptionalU32(data.rotation),
      placeable_ids: t.deserializeBiomesIdList(data.placeable_ids),
    });
  }
}
class CaptureGroupEventSerde {
  static serialize(event: ev.CaptureGroupEvent) {
    return {
      kind: "captureGroupEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
    };
  }

  static deserialize(data: any) {
    return new ev.CaptureGroupEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
    });
  }
}
class UnGroupEventSerde {
  static serialize(event: ev.UnGroupEvent) {
    return {
      kind: "unGroupEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      remove_voxels: event.remove_voxels,
    };
  }

  static deserialize(data: any) {
    return new ev.UnGroupEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      remove_voxels: t.deserializeBool(data.remove_voxels),
    });
  }
}
class RepairGroupEventSerde {
  static serialize(event: ev.RepairGroupEvent) {
    return {
      kind: "repairGroupEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
    };
  }

  static deserialize(data: any) {
    return new ev.RepairGroupEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
    });
  }
}
class UpdateGroupPreviewEventSerde {
  static serialize(event: ev.UpdateGroupPreviewEvent) {
    return {
      kind: "updateGroupPreviewEvent",
      id: t.serializeBiomesId(event.id),
      tensor: event.tensor,
      box: event.box,
      blueprint_id: t.serializeOptionalBiomesId(event.blueprint_id),
    };
  }

  static deserialize(data: any) {
    return new ev.UpdateGroupPreviewEvent({
      id: t.deserializeBiomesId(data.id),
      tensor: t.deserializeTensorBlob(data.tensor),
      box: t.deserializeBox2(data.box),
      blueprint_id: t.deserializeOptionalBiomesId(data.blueprint_id),
    });
  }
}
class DeleteGroupPreviewEventSerde {
  static serialize(event: ev.DeleteGroupPreviewEvent) {
    return {
      kind: "deleteGroupPreviewEvent",
      id: t.serializeBiomesId(event.id),
    };
  }

  static deserialize(data: any) {
    return new ev.DeleteGroupPreviewEvent({
      id: t.deserializeBiomesId(data.id),
    });
  }
}
class RestoreGroupEventSerde {
  static serialize(event: ev.RestoreGroupEvent) {
    return {
      kind: "restoreGroupEvent",
      id: t.serializeBiomesId(event.id),
      placeable_ids: t.serializeBiomesIdList(event.placeable_ids),
      restoreRegion: event.restoreRegion,
    };
  }

  static deserialize(data: any) {
    return new ev.RestoreGroupEvent({
      id: t.deserializeBiomesId(data.id),
      placeable_ids: t.deserializeBiomesIdList(data.placeable_ids),
      restoreRegion: t.deserializeOptionalAabb(data.restoreRegion),
    });
  }
}
class RestorePlaceableEventSerde {
  static serialize(event: ev.RestorePlaceableEvent) {
    return {
      kind: "restorePlaceableEvent",
      id: t.serializeBiomesId(event.id),
      restoreRegion: event.restoreRegion,
    };
  }

  static deserialize(data: any) {
    return new ev.RestorePlaceableEvent({
      id: t.deserializeBiomesId(data.id),
      restoreRegion: t.deserializeOptionalAabb(data.restoreRegion),
    });
  }
}
class CreatePhotoPortalEventSerde {
  static serialize(event: ev.CreatePhotoPortalEvent) {
    return {
      kind: "createPhotoPortalEvent",
      id: t.serializeBiomesId(event.id),
      photo_id: t.serializeBiomesId(event.photo_id),
      photo_author_id: t.serializeBiomesId(event.photo_author_id),
      position: event.position,
      orientation: event.orientation,
    };
  }

  static deserialize(data: any) {
    return new ev.CreatePhotoPortalEvent({
      id: t.deserializeBiomesId(data.id),
      photo_id: t.deserializeBiomesId(data.photo_id),
      photo_author_id: t.deserializeBiomesId(data.photo_author_id),
      position: t.deserializeVec3f(data.position),
      orientation: t.deserializeVec2f(data.orientation),
    });
  }
}
class ConsumptionEventSerde {
  static serialize(event: ev.ConsumptionEvent) {
    return {
      kind: "consumptionEvent",
      id: t.serializeBiomesId(event.id),
      item_id: t.serializeBiomesId(event.item_id),
      inventory_ref: t.serializeOwnedItemReference(event.inventory_ref),
      action: event.action,
    };
  }

  static deserialize(data: any) {
    return new ev.ConsumptionEvent({
      id: t.deserializeBiomesId(data.id),
      item_id: t.deserializeBiomesId(data.item_id),
      inventory_ref: t.deserializeOwnedItemReference(data.inventory_ref),
      action: t.deserializeConsumptionAction(data.action),
    });
  }
}
class RemoveBuffEventSerde {
  static serialize(event: ev.RemoveBuffEvent) {
    return {
      kind: "removeBuffEvent",
      id: t.serializeBiomesId(event.id),
      buff: t.serializeBuff(event.buff),
    };
  }

  static deserialize(data: any) {
    return new ev.RemoveBuffEvent({
      id: t.deserializeBiomesId(data.id),
      buff: t.deserializeBuff(data.buff),
    });
  }
}
class AdminInventoryGroupEventSerde {
  static serialize(event: ev.AdminInventoryGroupEvent) {
    return {
      kind: "adminInventoryGroupEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
    };
  }

  static deserialize(data: any) {
    return new ev.AdminInventoryGroupEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
    });
  }
}
class AdminResetChallengesEventSerde {
  static serialize(event: ev.AdminResetChallengesEvent) {
    return {
      kind: "adminResetChallengesEvent",
      id: t.serializeBiomesId(event.id),
      challenge_states: t.serializeChallengeStateMap(event.challenge_states),
    };
  }

  static deserialize(data: any) {
    return new ev.AdminResetChallengesEvent({
      id: t.deserializeBiomesId(data.id),
      challenge_states: t.deserializeChallengeStateMap(data.challenge_states),
    });
  }
}
class AdminResetRecipeEventSerde {
  static serialize(event: ev.AdminResetRecipeEvent) {
    return {
      kind: "adminResetRecipeEvent",
      id: t.serializeBiomesId(event.id),
      recipe_id: t.serializeBiomesId(event.recipe_id),
      clear_all: event.clear_all,
    };
  }

  static deserialize(data: any) {
    return new ev.AdminResetRecipeEvent({
      id: t.deserializeBiomesId(data.id),
      recipe_id: t.deserializeBiomesId(data.recipe_id),
      clear_all: t.deserializeOptionalBool(data.clear_all),
    });
  }
}
class AdminResetInventoryEventSerde {
  static serialize(event: ev.AdminResetInventoryEvent) {
    return {
      kind: "adminResetInventoryEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
    };
  }

  static deserialize(data: any) {
    return new ev.AdminResetInventoryEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
    });
  }
}
class AdminSetInfiniteCapacityContainerEventSerde {
  static serialize(event: ev.AdminSetInfiniteCapacityContainerEvent) {
    return {
      kind: "adminSetInfiniteCapacityContainerEvent",
      id: t.serializeBiomesId(event.id),
      infinite_capacity: event.infinite_capacity,
    };
  }

  static deserialize(data: any) {
    return new ev.AdminSetInfiniteCapacityContainerEvent({
      id: t.deserializeBiomesId(data.id),
      infinite_capacity: t.deserializeBool(data.infinite_capacity),
    });
  }
}
class AdminGiveItemEventSerde {
  static serialize(event: ev.AdminGiveItemEvent) {
    return {
      kind: "adminGiveItemEvent",
      id: t.serializeBiomesId(event.id),
      bag: t.serializeItemBag(event.bag),
      toOverflow: event.toOverflow,
    };
  }

  static deserialize(data: any) {
    return new ev.AdminGiveItemEvent({
      id: t.deserializeBiomesId(data.id),
      bag: t.deserializeItemBag(data.bag),
      toOverflow: t.deserializeOptionalBool(data.toOverflow),
    });
  }
}
class AdminRemoveItemEventSerde {
  static serialize(event: ev.AdminRemoveItemEvent) {
    return {
      kind: "adminRemoveItemEvent",
      id: t.serializeBiomesId(event.id),
      ref: t.serializeOwnedItemReference(event.ref),
    };
  }

  static deserialize(data: any) {
    return new ev.AdminRemoveItemEvent({
      id: t.deserializeBiomesId(data.id),
      ref: t.deserializeOwnedItemReference(data.ref),
    });
  }
}
class AdminDeleteEventSerde {
  static serialize(event: ev.AdminDeleteEvent) {
    return {
      kind: "adminDeleteEvent",
      id: t.serializeBiomesId(event.id),
      entity_id: t.serializeBiomesId(event.entity_id),
    };
  }

  static deserialize(data: any) {
    return new ev.AdminDeleteEvent({
      id: t.deserializeBiomesId(data.id),
      entity_id: t.deserializeBiomesId(data.entity_id),
    });
  }
}
class AdminIceEventSerde {
  static serialize(event: ev.AdminIceEvent) {
    return {
      kind: "adminIceEvent",
      id: t.serializeBiomesId(event.id),
      entity_id: t.serializeBiomesId(event.entity_id),
    };
  }

  static deserialize(data: any) {
    return new ev.AdminIceEvent({
      id: t.deserializeBiomesId(data.id),
      entity_id: t.deserializeBiomesId(data.entity_id),
    });
  }
}
class PlayerInitEventSerde {
  static serialize(event: ev.PlayerInitEvent) {
    return {
      kind: "playerInitEvent",
      id: t.serializeBiomesId(event.id),
    };
  }

  static deserialize(data: any) {
    return new ev.PlayerInitEvent({
      id: t.deserializeBiomesId(data.id),
    });
  }
}
class UpdatePlayerHealthEventSerde {
  static serialize(event: ev.UpdatePlayerHealthEvent) {
    return {
      kind: "updatePlayerHealthEvent",
      id: t.serializeBiomesId(event.id),
      hp: event.hp,
      hpDelta: event.hpDelta,
      maxHp: event.maxHp,
      damageSource: t.serializeOptionalDamageSource(event.damageSource),
    };
  }

  static deserialize(data: any) {
    return new ev.UpdatePlayerHealthEvent({
      id: t.deserializeBiomesId(data.id),
      hp: t.deserializeOptionalI32(data.hp),
      hpDelta: t.deserializeOptionalI32(data.hpDelta),
      maxHp: t.deserializeOptionalI32(data.maxHp),
      damageSource: t.deserializeOptionalDamageSource(data.damageSource),
    });
  }
}
class UpdateNpcHealthEventSerde {
  static serialize(event: ev.UpdateNpcHealthEvent) {
    return {
      kind: "updateNpcHealthEvent",
      id: t.serializeBiomesId(event.id),
      hp: event.hp,
      damageSource: t.serializeOptionalDamageSource(event.damageSource),
    };
  }

  static deserialize(data: any) {
    return new ev.UpdateNpcHealthEvent({
      id: t.deserializeBiomesId(data.id),
      hp: t.deserializeI32(data.hp),
      damageSource: t.deserializeOptionalDamageSource(data.damageSource),
    });
  }
}
class PickUpEventSerde {
  static serialize(event: ev.PickUpEvent) {
    return {
      kind: "pickUpEvent",
      id: t.serializeBiomesId(event.id),
      item: t.serializeBiomesId(event.item),
    };
  }

  static deserialize(data: any) {
    return new ev.PickUpEvent({
      id: t.deserializeBiomesId(data.id),
      item: t.deserializeBiomesId(data.item),
    });
  }
}
class RemoveMapBeamEventSerde {
  static serialize(event: ev.RemoveMapBeamEvent) {
    return {
      kind: "removeMapBeamEvent",
      id: t.serializeBiomesId(event.id),
      beam_client_id: event.beam_client_id,
      beam_location: event.beam_location,
    };
  }

  static deserialize(data: any) {
    return new ev.RemoveMapBeamEvent({
      id: t.deserializeBiomesId(data.id),
      beam_client_id: t.deserializeI32(data.beam_client_id),
      beam_location: t.deserializeVec2f(data.beam_location),
    });
  }
}
class SetNUXStatusEventSerde {
  static serialize(event: ev.SetNUXStatusEvent) {
    return {
      kind: "setNUXStatusEvent",
      id: t.serializeBiomesId(event.id),
      nux_id: event.nux_id,
      status: event.status,
    };
  }

  static deserialize(data: any) {
    return new ev.SetNUXStatusEvent({
      id: t.deserializeBiomesId(data.id),
      nux_id: t.deserializeI32(data.nux_id),
      status: t.deserializeNUXStatus(data.status),
    });
  }
}
class AcceptChallengeEventSerde {
  static serialize(event: ev.AcceptChallengeEvent) {
    return {
      kind: "acceptChallengeEvent",
      id: t.serializeBiomesId(event.id),
      challenge_id: t.serializeBiomesId(event.challenge_id),
      npc_id: t.serializeBiomesId(event.npc_id),
      chosen_gift_index: event.chosen_gift_index,
    };
  }

  static deserialize(data: any) {
    return new ev.AcceptChallengeEvent({
      id: t.deserializeBiomesId(data.id),
      challenge_id: t.deserializeBiomesId(data.challenge_id),
      npc_id: t.deserializeBiomesId(data.npc_id),
      chosen_gift_index: t.deserializeI32(data.chosen_gift_index),
    });
  }
}
class CompleteQuestStepAtEntityEventSerde {
  static serialize(event: ev.CompleteQuestStepAtEntityEvent) {
    return {
      kind: "completeQuestStepAtEntityEvent",
      id: t.serializeBiomesId(event.id),
      challenge_id: t.serializeBiomesId(event.challenge_id),
      entity_id: t.serializeBiomesId(event.entity_id),
      step_id: t.serializeBiomesId(event.step_id),
      chosen_reward_index: event.chosen_reward_index,
    };
  }

  static deserialize(data: any) {
    return new ev.CompleteQuestStepAtEntityEvent({
      id: t.deserializeBiomesId(data.id),
      challenge_id: t.deserializeBiomesId(data.challenge_id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      step_id: t.deserializeBiomesId(data.step_id),
      chosen_reward_index: t.deserializeI32(data.chosen_reward_index),
    });
  }
}
class ResetChallengeEventSerde {
  static serialize(event: ev.ResetChallengeEvent) {
    return {
      kind: "resetChallengeEvent",
      id: t.serializeBiomesId(event.id),
      challenge_id: t.serializeBiomesId(event.challenge_id),
    };
  }

  static deserialize(data: any) {
    return new ev.ResetChallengeEvent({
      id: t.deserializeBiomesId(data.id),
      challenge_id: t.deserializeBiomesId(data.challenge_id),
    });
  }
}
class ExpireBuffsEventSerde {
  static serialize(event: ev.ExpireBuffsEvent) {
    return {
      kind: "expireBuffsEvent",
      id: t.serializeBiomesId(event.id),
    };
  }

  static deserialize(data: any) {
    return new ev.ExpireBuffsEvent({
      id: t.deserializeBiomesId(data.id),
    });
  }
}
class ExpireRobotEventSerde {
  static serialize(event: ev.ExpireRobotEvent) {
    return {
      kind: "expireRobotEvent",
      id: t.serializeBiomesId(event.id),
    };
  }

  static deserialize(data: any) {
    return new ev.ExpireRobotEvent({
      id: t.deserializeBiomesId(data.id),
    });
  }
}
class AdminEditPresetEventSerde {
  static serialize(event: ev.AdminEditPresetEvent) {
    return {
      kind: "adminEditPresetEvent",
      id: t.serializeBiomesId(event.id),
      preset_id: t.serializeBiomesId(event.preset_id),
      name: event.name,
    };
  }

  static deserialize(data: any) {
    return new ev.AdminEditPresetEvent({
      id: t.deserializeBiomesId(data.id),
      preset_id: t.deserializeBiomesId(data.preset_id),
      name: t.deserializeString(data.name),
    });
  }
}
class AdminSavePresetEventSerde {
  static serialize(event: ev.AdminSavePresetEvent) {
    return {
      kind: "adminSavePresetEvent",
      id: t.serializeBiomesId(event.id),
      name: event.name,
      preset_id: t.serializeBiomesId(event.preset_id),
      player_id: t.serializeBiomesId(event.player_id),
    };
  }

  static deserialize(data: any) {
    return new ev.AdminSavePresetEvent({
      id: t.deserializeBiomesId(data.id),
      name: t.deserializeString(data.name),
      preset_id: t.deserializeBiomesId(data.preset_id),
      player_id: t.deserializeBiomesId(data.player_id),
    });
  }
}
class AdminLoadPresetEventSerde {
  static serialize(event: ev.AdminLoadPresetEvent) {
    return {
      kind: "adminLoadPresetEvent",
      id: t.serializeBiomesId(event.id),
      preset_id: t.serializeBiomesId(event.preset_id),
      player_id: t.serializeBiomesId(event.player_id),
    };
  }

  static deserialize(data: any) {
    return new ev.AdminLoadPresetEvent({
      id: t.deserializeBiomesId(data.id),
      preset_id: t.deserializeBiomesId(data.preset_id),
      player_id: t.deserializeBiomesId(data.player_id),
    });
  }
}
class TillSoilEventSerde {
  static serialize(event: ev.TillSoilEvent) {
    return {
      kind: "tillSoilEvent",
      id: t.serializeBiomesId(event.id),
      positions: event.positions,
      shard_ids: t.serializeBiomesIdList(event.shard_ids),
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
      occupancy_ids: t.serializeBiomesIdList(event.occupancy_ids),
    };
  }

  static deserialize(data: any) {
    return new ev.TillSoilEvent({
      id: t.deserializeBiomesId(data.id),
      positions: t.deserializeVec3iList(data.positions),
      shard_ids: t.deserializeBiomesIdList(data.shard_ids),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
      occupancy_ids: t.deserializeBiomesIdList(data.occupancy_ids),
    });
  }
}
class PlantSeedEventSerde {
  static serialize(event: ev.PlantSeedEvent) {
    return {
      kind: "plantSeedEvent",
      id: t.serializeBiomesId(event.id),
      position: event.position,
      user_id: t.serializeBiomesId(event.user_id),
      seed: t.serializeOwnedItemReference(event.seed),
      occupancy_id: t.serializeOptionalBiomesId(event.occupancy_id),
      existing_farming_id: t.serializeOptionalBiomesId(
        event.existing_farming_id
      ),
    };
  }

  static deserialize(data: any) {
    return new ev.PlantSeedEvent({
      id: t.deserializeBiomesId(data.id),
      position: t.deserializeVec3i(data.position),
      user_id: t.deserializeBiomesId(data.user_id),
      seed: t.deserializeOwnedItemReference(data.seed),
      occupancy_id: t.deserializeOptionalBiomesId(data.occupancy_id),
      existing_farming_id: t.deserializeOptionalBiomesId(
        data.existing_farming_id
      ),
    });
  }
}
class WaterPlantsEventSerde {
  static serialize(event: ev.WaterPlantsEvent) {
    return {
      kind: "waterPlantsEvent",
      id: t.serializeBiomesId(event.id),
      plant_ids: t.serializeBiomesIdList(event.plant_ids),
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
    };
  }

  static deserialize(data: any) {
    return new ev.WaterPlantsEvent({
      id: t.deserializeBiomesId(data.id),
      plant_ids: t.deserializeBiomesIdList(data.plant_ids),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
    });
  }
}
class FertilizePlantEventSerde {
  static serialize(event: ev.FertilizePlantEvent) {
    return {
      kind: "fertilizePlantEvent",
      id: t.serializeBiomesId(event.id),
      user_id: t.serializeBiomesId(event.user_id),
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
    };
  }

  static deserialize(data: any) {
    return new ev.FertilizePlantEvent({
      id: t.deserializeBiomesId(data.id),
      user_id: t.deserializeBiomesId(data.user_id),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
    });
  }
}
class AdminDestroyPlantEventSerde {
  static serialize(event: ev.AdminDestroyPlantEvent) {
    return {
      kind: "adminDestroyPlantEvent",
      id: t.serializeBiomesId(event.id),
      plant_id: t.serializeBiomesId(event.plant_id),
    };
  }

  static deserialize(data: any) {
    return new ev.AdminDestroyPlantEvent({
      id: t.deserializeBiomesId(data.id),
      plant_id: t.deserializeBiomesId(data.plant_id),
    });
  }
}
class FishingClaimEventSerde {
  static serialize(event: ev.FishingClaimEvent) {
    return {
      kind: "fishingClaimEvent",
      id: t.serializeBiomesId(event.id),
      bag: t.serializeItemBag(event.bag),
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
      catch_time: event.catch_time,
    };
  }

  static deserialize(data: any) {
    return new ev.FishingClaimEvent({
      id: t.deserializeBiomesId(data.id),
      bag: t.deserializeItemBag(data.bag),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
      catch_time: t.deserializeF64(data.catch_time),
    });
  }
}
class FishingCaughtEventSerde {
  static serialize(event: ev.FishingCaughtEvent) {
    return {
      kind: "fishingCaughtEvent",
      id: t.serializeBiomesId(event.id),
      bag: t.serializeItemBag(event.bag),
    };
  }

  static deserialize(data: any) {
    return new ev.FishingCaughtEvent({
      id: t.deserializeBiomesId(data.id),
      bag: t.deserializeItemBag(data.bag),
    });
  }
}
class FishingFailedEventSerde {
  static serialize(event: ev.FishingFailedEvent) {
    return {
      kind: "fishingFailedEvent",
      id: t.serializeBiomesId(event.id),
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
      catch_time: event.catch_time,
    };
  }

  static deserialize(data: any) {
    return new ev.FishingFailedEvent({
      id: t.deserializeBiomesId(data.id),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
      catch_time: t.deserializeF64(data.catch_time),
    });
  }
}
class FishingConsumeBaitEventSerde {
  static serialize(event: ev.FishingConsumeBaitEvent) {
    return {
      kind: "fishingConsumeBaitEvent",
      id: t.serializeBiomesId(event.id),
      ref: t.serializeOwnedItemReference(event.ref),
      item_id: t.serializeBiomesId(event.item_id),
    };
  }

  static deserialize(data: any) {
    return new ev.FishingConsumeBaitEvent({
      id: t.deserializeBiomesId(data.id),
      ref: t.deserializeOwnedItemReference(data.ref),
      item_id: t.deserializeBiomesId(data.item_id),
    });
  }
}
class TreasureRollEventSerde {
  static serialize(event: ev.TreasureRollEvent) {
    return {
      kind: "treasureRollEvent",
      id: t.serializeBiomesId(event.id),
      ref: t.serializeOwnedItemReference(event.ref),
      item: t.serializeItem(event.item),
    };
  }

  static deserialize(data: any) {
    return new ev.TreasureRollEvent({
      id: t.deserializeBiomesId(data.id),
      ref: t.deserializeOwnedItemReference(data.ref),
      item: t.deserializeItem(data.item),
    });
  }
}
class CreateOrJoinSpleefEventSerde {
  static serialize(event: ev.CreateOrJoinSpleefEvent) {
    return {
      kind: "createOrJoinSpleefEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_instance_id: t.serializeOptionalBiomesId(
        event.minigame_instance_id
      ),
      box: event.box,
    };
  }

  static deserialize(data: any) {
    return new ev.CreateOrJoinSpleefEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_instance_id: t.deserializeOptionalBiomesId(
        data.minigame_instance_id
      ),
      box: t.deserializeBox2(data.box),
    });
  }
}
class JoinDeathmatchEventSerde {
  static serialize(event: ev.JoinDeathmatchEvent) {
    return {
      kind: "joinDeathmatchEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_instance_id: t.serializeOptionalBiomesId(
        event.minigame_instance_id
      ),
    };
  }

  static deserialize(data: any) {
    return new ev.JoinDeathmatchEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_instance_id: t.deserializeOptionalBiomesId(
        data.minigame_instance_id
      ),
    });
  }
}
class FinishSimpleRaceMinigameEventSerde {
  static serialize(event: ev.FinishSimpleRaceMinigameEvent) {
    return {
      kind: "finishSimpleRaceMinigameEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_element_id: t.serializeBiomesId(event.minigame_element_id),
      minigame_instance_id: t.serializeBiomesId(event.minigame_instance_id),
    };
  }

  static deserialize(data: any) {
    return new ev.FinishSimpleRaceMinigameEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_element_id: t.deserializeBiomesId(data.minigame_element_id),
      minigame_instance_id: t.deserializeBiomesId(data.minigame_instance_id),
    });
  }
}
class StartSimpleRaceMinigameEventSerde {
  static serialize(event: ev.StartSimpleRaceMinigameEvent) {
    return {
      kind: "startSimpleRaceMinigameEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_element_id: t.serializeBiomesId(event.minigame_element_id),
    };
  }

  static deserialize(data: any) {
    return new ev.StartSimpleRaceMinigameEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_element_id: t.deserializeBiomesId(data.minigame_element_id),
    });
  }
}
class ReachStartSimpleRaceMinigameEventSerde {
  static serialize(event: ev.ReachStartSimpleRaceMinigameEvent) {
    return {
      kind: "reachStartSimpleRaceMinigameEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_element_id: t.serializeBiomesId(event.minigame_element_id),
      minigame_instance_id: t.serializeBiomesId(event.minigame_instance_id),
    };
  }

  static deserialize(data: any) {
    return new ev.ReachStartSimpleRaceMinigameEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_element_id: t.deserializeBiomesId(data.minigame_element_id),
      minigame_instance_id: t.deserializeBiomesId(data.minigame_instance_id),
    });
  }
}
class ReachCheckpointSimpleRaceMinigameEventSerde {
  static serialize(event: ev.ReachCheckpointSimpleRaceMinigameEvent) {
    return {
      kind: "reachCheckpointSimpleRaceMinigameEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_element_id: t.serializeBiomesId(event.minigame_element_id),
      minigame_instance_id: t.serializeBiomesId(event.minigame_instance_id),
    };
  }

  static deserialize(data: any) {
    return new ev.ReachCheckpointSimpleRaceMinigameEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_element_id: t.deserializeBiomesId(data.minigame_element_id),
      minigame_instance_id: t.deserializeBiomesId(data.minigame_instance_id),
    });
  }
}
class RestartSimpleRaceMinigameEventSerde {
  static serialize(event: ev.RestartSimpleRaceMinigameEvent) {
    return {
      kind: "restartSimpleRaceMinigameEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_instance_id: t.serializeBiomesId(event.minigame_instance_id),
    };
  }

  static deserialize(data: any) {
    return new ev.RestartSimpleRaceMinigameEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_instance_id: t.deserializeBiomesId(data.minigame_instance_id),
    });
  }
}
class TagMinigameHitPlayerEventSerde {
  static serialize(event: ev.TagMinigameHitPlayerEvent) {
    return {
      kind: "tagMinigameHitPlayerEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_instance_id: t.serializeBiomesId(event.minigame_instance_id),
      hit_player_id: t.serializeBiomesId(event.hit_player_id),
    };
  }

  static deserialize(data: any) {
    return new ev.TagMinigameHitPlayerEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_instance_id: t.deserializeBiomesId(data.minigame_instance_id),
      hit_player_id: t.deserializeBiomesId(data.hit_player_id),
    });
  }
}
class QuitMinigameEventSerde {
  static serialize(event: ev.QuitMinigameEvent) {
    return {
      kind: "quitMinigameEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_instance_id: t.serializeBiomesId(event.minigame_instance_id),
    };
  }

  static deserialize(data: any) {
    return new ev.QuitMinigameEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_instance_id: t.deserializeBiomesId(data.minigame_instance_id),
    });
  }
}
class GiveMinigameKitEventSerde {
  static serialize(event: ev.GiveMinigameKitEvent) {
    return {
      kind: "giveMinigameKitEvent",
      id: t.serializeBiomesId(event.id),
      kit: t.serializeGiveMinigameKitData(event.kit),
    };
  }

  static deserialize(data: any) {
    return new ev.GiveMinigameKitEvent({
      id: t.deserializeBiomesId(data.id),
      kit: t.deserializeGiveMinigameKitData(data.kit),
    });
  }
}
class TouchMinigameStatsEventSerde {
  static serialize(event: ev.TouchMinigameStatsEvent) {
    return {
      kind: "touchMinigameStatsEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
    };
  }

  static deserialize(data: any) {
    return new ev.TouchMinigameStatsEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
    });
  }
}
class EditMinigameMetadataEventSerde {
  static serialize(event: ev.EditMinigameMetadataEvent) {
    return {
      kind: "editMinigameMetadataEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      label: event.label,
      hero_photo_id: t.serializeOptionalBiomesId(event.hero_photo_id),
      minigame_settings: event.minigame_settings,
      entry_price: event.entry_price,
    };
  }

  static deserialize(data: any) {
    return new ev.EditMinigameMetadataEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      label: t.deserializeOptionalString(data.label),
      hero_photo_id: t.deserializeOptionalBiomesId(data.hero_photo_id),
      minigame_settings: t.deserializeOptionalBuffer(data.minigame_settings),
      entry_price: t.deserializeOptionalF64(data.entry_price),
    });
  }
}
class MinigameInstanceTickEventSerde {
  static serialize(event: ev.MinigameInstanceTickEvent) {
    return {
      kind: "minigameInstanceTickEvent",
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_instance_id: t.serializeBiomesId(event.minigame_instance_id),
      denorm_space_clipboard_info:
        t.serializeOptionalMinigameInstanceSpaceClipboardInfo(
          event.denorm_space_clipboard_info
        ),
    };
  }

  static deserialize(data: any) {
    return new ev.MinigameInstanceTickEvent({
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_instance_id: t.deserializeBiomesId(data.minigame_instance_id),
      denorm_space_clipboard_info:
        t.deserializeOptionalMinigameInstanceSpaceClipboardInfo(
          data.denorm_space_clipboard_info
        ),
    });
  }
}
class ExpireMinigameInstanceEventSerde {
  static serialize(event: ev.ExpireMinigameInstanceEvent) {
    return {
      kind: "expireMinigameInstanceEvent",
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_instance_id: t.serializeBiomesId(event.minigame_instance_id),
      denorm_space_clipboard_info:
        t.serializeOptionalMinigameInstanceSpaceClipboardInfo(
          event.denorm_space_clipboard_info
        ),
    };
  }

  static deserialize(data: any) {
    return new ev.ExpireMinigameInstanceEvent({
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_instance_id: t.deserializeBiomesId(data.minigame_instance_id),
      denorm_space_clipboard_info:
        t.deserializeOptionalMinigameInstanceSpaceClipboardInfo(
          data.denorm_space_clipboard_info
        ),
    });
  }
}
class AssociateMinigameElementEventSerde {
  static serialize(event: ev.AssociateMinigameElementEvent) {
    return {
      kind: "associateMinigameElementEvent",
      id: t.serializeBiomesId(event.id),
      minigame_id: t.serializeBiomesId(event.minigame_id),
      minigame_element_id: t.serializeBiomesId(event.minigame_element_id),
      old_minigame_id: t.serializeOptionalBiomesId(event.old_minigame_id),
    };
  }

  static deserialize(data: any) {
    return new ev.AssociateMinigameElementEvent({
      id: t.deserializeBiomesId(data.id),
      minigame_id: t.deserializeBiomesId(data.minigame_id),
      minigame_element_id: t.deserializeBiomesId(data.minigame_element_id),
      old_minigame_id: t.deserializeOptionalBiomesId(data.old_minigame_id),
    });
  }
}
class CreateMinigameThroughAssocationEventSerde {
  static serialize(event: ev.CreateMinigameThroughAssocationEvent) {
    return {
      kind: "createMinigameThroughAssocationEvent",
      id: t.serializeBiomesId(event.id),
      name: event.name,
      minigameType: event.minigameType,
      minigame_element_id: t.serializeBiomesId(event.minigame_element_id),
      old_minigame_id: t.serializeOptionalBiomesId(event.old_minigame_id),
    };
  }

  static deserialize(data: any) {
    return new ev.CreateMinigameThroughAssocationEvent({
      id: t.deserializeBiomesId(data.id),
      name: t.deserializeString(data.name),
      minigameType: t.deserializeMinigameType(data.minigameType),
      minigame_element_id: t.deserializeBiomesId(data.minigame_element_id),
      old_minigame_id: t.deserializeOptionalBiomesId(data.old_minigame_id),
    });
  }
}
class AckWarpEventSerde {
  static serialize(event: ev.AckWarpEvent) {
    return {
      kind: "ackWarpEvent",
      id: t.serializeBiomesId(event.id),
    };
  }

  static deserialize(data: any) {
    return new ev.AckWarpEvent({
      id: t.deserializeBiomesId(data.id),
    });
  }
}
class ReplenishWateringCanEventSerde {
  static serialize(event: ev.ReplenishWateringCanEvent) {
    return {
      kind: "replenishWateringCanEvent",
      id: t.serializeBiomesId(event.id),
      position: event.position,
      tool_ref: t.serializeOwnedItemReference(event.tool_ref),
      user_id: t.serializeBiomesId(event.user_id),
    };
  }

  static deserialize(data: any) {
    return new ev.ReplenishWateringCanEvent({
      id: t.deserializeBiomesId(data.id),
      position: t.deserializeVec3i(data.position),
      tool_ref: t.deserializeOwnedItemReference(data.tool_ref),
      user_id: t.deserializeBiomesId(data.user_id),
    });
  }
}
class SpaceClipboardWandCutEventSerde {
  static serialize(event: ev.SpaceClipboardWandCutEvent) {
    return {
      kind: "spaceClipboardWandCutEvent",
      id: t.serializeBiomesId(event.id),
      item_ref: t.serializeOwnedItemReference(event.item_ref),
      box: event.box,
    };
  }

  static deserialize(data: any) {
    return new ev.SpaceClipboardWandCutEvent({
      id: t.deserializeBiomesId(data.id),
      item_ref: t.deserializeOwnedItemReference(data.item_ref),
      box: t.deserializeBox2(data.box),
    });
  }
}
class SpaceClipboardWandCopyEventSerde {
  static serialize(event: ev.SpaceClipboardWandCopyEvent) {
    return {
      kind: "spaceClipboardWandCopyEvent",
      id: t.serializeBiomesId(event.id),
      item_ref: t.serializeOwnedItemReference(event.item_ref),
      box: event.box,
    };
  }

  static deserialize(data: any) {
    return new ev.SpaceClipboardWandCopyEvent({
      id: t.deserializeBiomesId(data.id),
      item_ref: t.deserializeOwnedItemReference(data.item_ref),
      box: t.deserializeBox2(data.box),
    });
  }
}
class SpaceClipboardWandPasteEventSerde {
  static serialize(event: ev.SpaceClipboardWandPasteEvent) {
    return {
      kind: "spaceClipboardWandPasteEvent",
      id: t.serializeBiomesId(event.id),
      item_ref: t.serializeOwnedItemReference(event.item_ref),
      space_entity_id: t.serializeBiomesId(event.space_entity_id),
      new_box: event.new_box,
    };
  }

  static deserialize(data: any) {
    return new ev.SpaceClipboardWandPasteEvent({
      id: t.deserializeBiomesId(data.id),
      item_ref: t.deserializeOwnedItemReference(data.item_ref),
      space_entity_id: t.deserializeBiomesId(data.space_entity_id),
      new_box: t.deserializeBox2(data.new_box),
    });
  }
}
class SpaceClipboardWandDiscardEventSerde {
  static serialize(event: ev.SpaceClipboardWandDiscardEvent) {
    return {
      kind: "spaceClipboardWandDiscardEvent",
      id: t.serializeBiomesId(event.id),
      item_ref: t.serializeOwnedItemReference(event.item_ref),
      space_entity_id: t.serializeBiomesId(event.space_entity_id),
      new_box: event.new_box,
    };
  }

  static deserialize(data: any) {
    return new ev.SpaceClipboardWandDiscardEvent({
      id: t.deserializeBiomesId(data.id),
      item_ref: t.deserializeOwnedItemReference(data.item_ref),
      space_entity_id: t.deserializeBiomesId(data.space_entity_id),
      new_box: t.deserializeBox2(data.new_box),
    });
  }
}
class NegaWandRestoreEventSerde {
  static serialize(event: ev.NegaWandRestoreEvent) {
    return {
      kind: "negaWandRestoreEvent",
      id: t.serializeBiomesId(event.id),
      item_ref: t.serializeOwnedItemReference(event.item_ref),
      box: event.box,
    };
  }

  static deserialize(data: any) {
    return new ev.NegaWandRestoreEvent({
      id: t.deserializeBiomesId(data.id),
      item_ref: t.deserializeOwnedItemReference(data.item_ref),
      box: t.deserializeBox2(data.box),
    });
  }
}
class PlacerWandEventSerde {
  static serialize(event: ev.PlacerWandEvent) {
    return {
      kind: "placerWandEvent",
      id: t.serializeBiomesId(event.id),
      item_ref: t.serializeOwnedItemReference(event.item_ref),
      positions: event.positions,
    };
  }

  static deserialize(data: any) {
    return new ev.PlacerWandEvent({
      id: t.deserializeBiomesId(data.id),
      item_ref: t.deserializeOwnedItemReference(data.item_ref),
      positions: t.deserializeVec3iList(data.positions),
    });
  }
}
class ClearPlacerEventSerde {
  static serialize(event: ev.ClearPlacerEvent) {
    return {
      kind: "clearPlacerEvent",
      id: t.serializeBiomesId(event.id),
      item_ref: t.serializeOwnedItemReference(event.item_ref),
      positions: event.positions,
    };
  }

  static deserialize(data: any) {
    return new ev.ClearPlacerEvent({
      id: t.deserializeBiomesId(data.id),
      item_ref: t.deserializeOwnedItemReference(data.item_ref),
      positions: t.deserializeVec3iList(data.positions),
    });
  }
}
class DespawnWandEventSerde {
  static serialize(event: ev.DespawnWandEvent) {
    return {
      kind: "despawnWandEvent",
      id: t.serializeBiomesId(event.id),
      item_ref: t.serializeOwnedItemReference(event.item_ref),
      entityId: t.serializeBiomesId(event.entityId),
    };
  }

  static deserialize(data: any) {
    return new ev.DespawnWandEvent({
      id: t.deserializeBiomesId(data.id),
      item_ref: t.deserializeOwnedItemReference(data.item_ref),
      entityId: t.deserializeBiomesId(data.entityId),
    });
  }
}
class SellToEntityEventSerde {
  static serialize(event: ev.SellToEntityEvent) {
    return {
      kind: "sellToEntityEvent",
      id: t.serializeBiomesId(event.id),
      purchaser_id: t.serializeBiomesId(event.purchaser_id),
      seller_id: t.serializeBiomesId(event.seller_id),
      src: t.serializeInventoryAssignmentPattern(event.src),
    };
  }

  static deserialize(data: any) {
    return new ev.SellToEntityEvent({
      id: t.deserializeBiomesId(data.id),
      purchaser_id: t.deserializeBiomesId(data.purchaser_id),
      seller_id: t.deserializeBiomesId(data.seller_id),
      src: t.deserializeInventoryAssignmentPattern(data.src),
    });
  }
}
class SetNPCPositionEventSerde {
  static serialize(event: ev.SetNPCPositionEvent) {
    return {
      kind: "setNPCPositionEvent",
      id: t.serializeBiomesId(event.id),
      entity_id: t.serializeBiomesId(event.entity_id),
      position: event.position,
      orientation: event.orientation,
      update_spawn: event.update_spawn,
    };
  }

  static deserialize(data: any) {
    return new ev.SetNPCPositionEvent({
      id: t.deserializeBiomesId(data.id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      position: t.deserializeOptionalVec3f(data.position),
      orientation: t.deserializeOptionalVec2f(data.orientation),
      update_spawn: t.deserializeOptionalBool(data.update_spawn),
    });
  }
}
class AdminUpdateInspectionTweaksEventSerde {
  static serialize(event: ev.AdminUpdateInspectionTweaksEvent) {
    return {
      kind: "adminUpdateInspectionTweaksEvent",
      id: t.serializeBiomesId(event.id),
      entity_id: t.serializeBiomesId(event.entity_id),
      hidden: event.hidden,
    };
  }

  static deserialize(data: any) {
    return new ev.AdminUpdateInspectionTweaksEvent({
      id: t.deserializeBiomesId(data.id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      hidden: t.deserializeOptionalBool(data.hidden),
    });
  }
}
class CreateTeamEventSerde {
  static serialize(event: ev.CreateTeamEvent) {
    return {
      kind: "createTeamEvent",
      id: t.serializeBiomesId(event.id),
      name: event.name,
    };
  }

  static deserialize(data: any) {
    return new ev.CreateTeamEvent({
      id: t.deserializeBiomesId(data.id),
      name: t.deserializeString(data.name),
    });
  }
}
class UpdateTeamMetadataEventSerde {
  static serialize(event: ev.UpdateTeamMetadataEvent) {
    return {
      kind: "updateTeamMetadataEvent",
      id: t.serializeBiomesId(event.id),
      team_id: t.serializeBiomesId(event.team_id),
      name: event.name,
      icon: event.icon,
      color: event.color,
      hero_photo_id: t.serializeOptionalBiomesId(event.hero_photo_id),
    };
  }

  static deserialize(data: any) {
    return new ev.UpdateTeamMetadataEvent({
      id: t.deserializeBiomesId(data.id),
      team_id: t.deserializeBiomesId(data.team_id),
      name: t.deserializeOptionalString(data.name),
      icon: t.deserializeOptionalString(data.icon),
      color: t.deserializeOptionalI32(data.color),
      hero_photo_id: t.deserializeOptionalBiomesId(data.hero_photo_id),
    });
  }
}
class InvitePlayerToTeamEventSerde {
  static serialize(event: ev.InvitePlayerToTeamEvent) {
    return {
      kind: "invitePlayerToTeamEvent",
      id: t.serializeBiomesId(event.id),
      team_id: t.serializeBiomesId(event.team_id),
      player_id: t.serializeBiomesId(event.player_id),
    };
  }

  static deserialize(data: any) {
    return new ev.InvitePlayerToTeamEvent({
      id: t.deserializeBiomesId(data.id),
      team_id: t.deserializeBiomesId(data.team_id),
      player_id: t.deserializeBiomesId(data.player_id),
    });
  }
}
class RequestToJoinTeamEventSerde {
  static serialize(event: ev.RequestToJoinTeamEvent) {
    return {
      kind: "requestToJoinTeamEvent",
      id: t.serializeBiomesId(event.id),
      entity_id: t.serializeBiomesId(event.entity_id),
      team_id: t.serializeBiomesId(event.team_id),
    };
  }

  static deserialize(data: any) {
    return new ev.RequestToJoinTeamEvent({
      id: t.deserializeBiomesId(data.id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      team_id: t.deserializeBiomesId(data.team_id),
    });
  }
}
class RequestedToJoinTeamEventSerde {
  static serialize(event: ev.RequestedToJoinTeamEvent) {
    return {
      kind: "requestedToJoinTeamEvent",
      id: t.serializeBiomesId(event.id),
      entity_id: t.serializeBiomesId(event.entity_id),
      team_id: t.serializeBiomesId(event.team_id),
    };
  }

  static deserialize(data: any) {
    return new ev.RequestedToJoinTeamEvent({
      id: t.deserializeBiomesId(data.id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      team_id: t.deserializeBiomesId(data.team_id),
    });
  }
}
class CancelRequestToJoinTeamEventSerde {
  static serialize(event: ev.CancelRequestToJoinTeamEvent) {
    return {
      kind: "cancelRequestToJoinTeamEvent",
      id: t.serializeBiomesId(event.id),
      entity_id: t.serializeBiomesId(event.entity_id),
      team_id: t.serializeBiomesId(event.team_id),
    };
  }

  static deserialize(data: any) {
    return new ev.CancelRequestToJoinTeamEvent({
      id: t.deserializeBiomesId(data.id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      team_id: t.deserializeBiomesId(data.team_id),
    });
  }
}
class RespondToJoinTeamRequestEventSerde {
  static serialize(event: ev.RespondToJoinTeamRequestEvent) {
    return {
      kind: "respondToJoinTeamRequestEvent",
      id: t.serializeBiomesId(event.id),
      entity_id: t.serializeBiomesId(event.entity_id),
      team_id: t.serializeBiomesId(event.team_id),
      response: event.response,
    };
  }

  static deserialize(data: any) {
    return new ev.RespondToJoinTeamRequestEvent({
      id: t.deserializeBiomesId(data.id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      team_id: t.deserializeBiomesId(data.team_id),
      response: t.deserializeString(data.response),
    });
  }
}
class RequestToJoinTeamAcceptedEventSerde {
  static serialize(event: ev.RequestToJoinTeamAcceptedEvent) {
    return {
      kind: "requestToJoinTeamAcceptedEvent",
      id: t.serializeBiomesId(event.id),
      entity_id: t.serializeBiomesId(event.entity_id),
      team_id: t.serializeBiomesId(event.team_id),
    };
  }

  static deserialize(data: any) {
    return new ev.RequestToJoinTeamAcceptedEvent({
      id: t.deserializeBiomesId(data.id),
      entity_id: t.deserializeBiomesId(data.entity_id),
      team_id: t.deserializeBiomesId(data.team_id),
    });
  }
}
class JoinTeamEventSerde {
  static serialize(event: ev.JoinTeamEvent) {
    return {
      kind: "joinTeamEvent",
      id: t.serializeBiomesId(event.id),
      team_id: t.serializeBiomesId(event.team_id),
    };
  }

  static deserialize(data: any) {
    return new ev.JoinTeamEvent({
      id: t.deserializeBiomesId(data.id),
      team_id: t.deserializeBiomesId(data.team_id),
    });
  }
}
class CancelTeamInviteEventSerde {
  static serialize(event: ev.CancelTeamInviteEvent) {
    return {
      kind: "cancelTeamInviteEvent",
      id: t.serializeBiomesId(event.id),
      team_id: t.serializeBiomesId(event.team_id),
      invitee_id: t.serializeBiomesId(event.invitee_id),
    };
  }

  static deserialize(data: any) {
    return new ev.CancelTeamInviteEvent({
      id: t.deserializeBiomesId(data.id),
      team_id: t.deserializeBiomesId(data.team_id),
      invitee_id: t.deserializeBiomesId(data.invitee_id),
    });
  }
}
class KickTeamMemberEventSerde {
  static serialize(event: ev.KickTeamMemberEvent) {
    return {
      kind: "kickTeamMemberEvent",
      id: t.serializeBiomesId(event.id),
      team_id: t.serializeBiomesId(event.team_id),
      kicked_player_id: t.serializeBiomesId(event.kicked_player_id),
    };
  }

  static deserialize(data: any) {
    return new ev.KickTeamMemberEvent({
      id: t.deserializeBiomesId(data.id),
      team_id: t.deserializeBiomesId(data.team_id),
      kicked_player_id: t.deserializeBiomesId(data.kicked_player_id),
    });
  }
}
class DeclineTeamInviteEventSerde {
  static serialize(event: ev.DeclineTeamInviteEvent) {
    return {
      kind: "declineTeamInviteEvent",
      id: t.serializeBiomesId(event.id),
      team_id: t.serializeBiomesId(event.team_id),
    };
  }

  static deserialize(data: any) {
    return new ev.DeclineTeamInviteEvent({
      id: t.deserializeBiomesId(data.id),
      team_id: t.deserializeBiomesId(data.team_id),
    });
  }
}
class QuitTeamEventSerde {
  static serialize(event: ev.QuitTeamEvent) {
    return {
      kind: "quitTeamEvent",
      id: t.serializeBiomesId(event.id),
      team_id: t.serializeBiomesId(event.team_id),
    };
  }

  static deserialize(data: any) {
    return new ev.QuitTeamEvent({
      id: t.deserializeBiomesId(data.id),
      team_id: t.deserializeBiomesId(data.team_id),
    });
  }
}
class BeginTradeEventSerde {
  static serialize(event: ev.BeginTradeEvent) {
    return {
      kind: "beginTradeEvent",
      id: t.serializeBiomesId(event.id),
      id2: t.serializeBiomesId(event.id2),
    };
  }

  static deserialize(data: any) {
    return new ev.BeginTradeEvent({
      id: t.deserializeBiomesId(data.id),
      id2: t.deserializeBiomesId(data.id2),
    });
  }
}
class AcceptTradeEventSerde {
  static serialize(event: ev.AcceptTradeEvent) {
    return {
      kind: "acceptTradeEvent",
      id: t.serializeBiomesId(event.id),
      trade_id: t.serializeBiomesId(event.trade_id),
      other_trader_id: t.serializeBiomesId(event.other_trader_id),
    };
  }

  static deserialize(data: any) {
    return new ev.AcceptTradeEvent({
      id: t.deserializeBiomesId(data.id),
      trade_id: t.deserializeBiomesId(data.trade_id),
      other_trader_id: t.deserializeBiomesId(data.other_trader_id),
    });
  }
}
class ChangeTradeOfferEventSerde {
  static serialize(event: ev.ChangeTradeOfferEvent) {
    return {
      kind: "changeTradeOfferEvent",
      id: t.serializeBiomesId(event.id),
      offer: t.serializeInventoryAssignmentPattern(event.offer),
      trade_id: t.serializeBiomesId(event.trade_id),
    };
  }

  static deserialize(data: any) {
    return new ev.ChangeTradeOfferEvent({
      id: t.deserializeBiomesId(data.id),
      offer: t.deserializeInventoryAssignmentPattern(data.offer),
      trade_id: t.deserializeBiomesId(data.trade_id),
    });
  }
}
class ExpireTradeEventSerde {
  static serialize(event: ev.ExpireTradeEvent) {
    return {
      kind: "expireTradeEvent",
      id: t.serializeBiomesId(event.id),
    };
  }

  static deserialize(data: any) {
    return new ev.ExpireTradeEvent({
      id: t.deserializeBiomesId(data.id),
    });
  }
}
class GiveGiftEventSerde {
  static serialize(event: ev.GiveGiftEvent) {
    return {
      kind: "giveGiftEvent",
      id: t.serializeBiomesId(event.id),
      target: t.serializeBiomesId(event.target),
      target_robot: t.serializeBiomesId(event.target_robot),
    };
  }

  static deserialize(data: any) {
    return new ev.GiveGiftEvent({
      id: t.deserializeBiomesId(data.id),
      target: t.deserializeBiomesId(data.target),
      target_robot: t.deserializeBiomesId(data.target_robot),
    });
  }
}
class GiveMailboxItemEventSerde {
  static serialize(event: ev.GiveMailboxItemEvent) {
    return {
      kind: "giveMailboxItemEvent",
      player_id: t.serializeBiomesId(event.player_id),
      src_id: t.serializeBiomesId(event.src_id),
      src: t.serializeOwnedItemReference(event.src),
      count: t.serializeU64(event.count),
      dst_id: t.serializeOptionalBiomesId(event.dst_id),
      dst: t.serializeOwnedItemReference(event.dst),
      target_player_id: t.serializeBiomesId(event.target_player_id),
      positions: event.positions,
    };
  }

  static deserialize(data: any) {
    return new ev.GiveMailboxItemEvent({
      player_id: t.deserializeBiomesId(data.player_id),
      src_id: t.deserializeBiomesId(data.src_id),
      src: t.deserializeOwnedItemReference(data.src),
      count: t.deserializeU64(data.count),
      dst_id: t.deserializeOptionalBiomesId(data.dst_id),
      dst: t.deserializeOwnedItemReference(data.dst),
      target_player_id: t.deserializeBiomesId(data.target_player_id),
      positions: t.deserializeVec3iList(data.positions),
    });
  }
}
class UnwrapWrappedItemEventSerde {
  static serialize(event: ev.UnwrapWrappedItemEvent) {
    return {
      kind: "unwrapWrappedItemEvent",
      id: t.serializeBiomesId(event.id),
      ref: t.serializeOwnedItemReference(event.ref),
      item: t.serializeItem(event.item),
    };
  }

  static deserialize(data: any) {
    return new ev.UnwrapWrappedItemEvent({
      id: t.deserializeBiomesId(data.id),
      ref: t.deserializeOwnedItemReference(data.ref),
      item: t.deserializeItem(data.item),
    });
  }
}
class PokePlantEventSerde {
  static serialize(event: ev.PokePlantEvent) {
    return {
      kind: "pokePlantEvent",
      id: t.serializeBiomesId(event.id),
    };
  }

  static deserialize(data: any) {
    return new ev.PokePlantEvent({
      id: t.deserializeBiomesId(data.id),
    });
  }
}
class AddToOutfitEventSerde {
  static serialize(event: ev.AddToOutfitEvent) {
    return {
      kind: "addToOutfitEvent",
      id: t.serializeBiomesId(event.id),
      player_id: t.serializeBiomesId(event.player_id),
      src_id: t.serializeBiomesId(event.src_id),
      src: t.serializeOwnedItemReference(event.src),
    };
  }

  static deserialize(data: any) {
    return new ev.AddToOutfitEvent({
      id: t.deserializeBiomesId(data.id),
      player_id: t.deserializeBiomesId(data.player_id),
      src_id: t.deserializeBiomesId(data.src_id),
      src: t.deserializeOwnedItemReference(data.src),
    });
  }
}
class EquipOutfitEventSerde {
  static serialize(event: ev.EquipOutfitEvent) {
    return {
      kind: "equipOutfitEvent",
      id: t.serializeBiomesId(event.id),
      player_id: t.serializeBiomesId(event.player_id),
    };
  }

  static deserialize(data: any) {
    return new ev.EquipOutfitEvent({
      id: t.deserializeBiomesId(data.id),
      player_id: t.deserializeBiomesId(data.player_id),
    });
  }
}

export class EventSerde {
  static serialize(event?: ev.Event) {
    switch (event?.kind) {
      case "disconnectPlayerEvent":
        return DisconnectPlayerEventSerde.serialize(
          event as ev.DisconnectPlayerEvent
        );
      case "moveEvent":
        return MoveEventSerde.serialize(event as ev.MoveEvent);
      case "idleChangeEvent":
        return IdleChangeEventSerde.serialize(event as ev.IdleChangeEvent);
      case "enterRobotFieldEvent":
        return EnterRobotFieldEventSerde.serialize(
          event as ev.EnterRobotFieldEvent
        );
      case "warpEvent":
        return WarpEventSerde.serialize(event as ev.WarpEvent);
      case "warpHomeEvent":
        return WarpHomeEventSerde.serialize(event as ev.WarpHomeEvent);
      case "editEvent":
        return EditEventSerde.serialize(event as ev.EditEvent);
      case "shapeEvent":
        return ShapeEventSerde.serialize(event as ev.ShapeEvent);
      case "farmingEvent":
        return FarmingEventSerde.serialize(event as ev.FarmingEvent);
      case "dumpWaterEvent":
        return DumpWaterEventSerde.serialize(event as ev.DumpWaterEvent);
      case "scoopWaterEvent":
        return ScoopWaterEventSerde.serialize(event as ev.ScoopWaterEvent);
      case "inventoryCombineEvent":
        return InventoryCombineEventSerde.serialize(
          event as ev.InventoryCombineEvent
        );
      case "inventorySplitEvent":
        return InventorySplitEventSerde.serialize(
          event as ev.InventorySplitEvent
        );
      case "inventorySortEvent":
        return InventorySortEventSerde.serialize(
          event as ev.InventorySortEvent
        );
      case "inventorySwapEvent":
        return InventorySwapEventSerde.serialize(
          event as ev.InventorySwapEvent
        );
      case "robotInventorySwapEvent":
        return RobotInventorySwapEventSerde.serialize(
          event as ev.RobotInventorySwapEvent
        );
      case "inventoryThrowEvent":
        return InventoryThrowEventSerde.serialize(
          event as ev.InventoryThrowEvent
        );
      case "inventoryDestroyEvent":
        return InventoryDestroyEventSerde.serialize(
          event as ev.InventoryDestroyEvent
        );
      case "dyeBlockEvent":
        return DyeBlockEventSerde.serialize(event as ev.DyeBlockEvent);
      case "unmuckerEvent":
        return UnmuckerEventSerde.serialize(event as ev.UnmuckerEvent);
      case "internalInventorySetEvent":
        return InternalInventorySetEventSerde.serialize(
          event as ev.InternalInventorySetEvent
        );
      case "inventoryCraftEvent":
        return InventoryCraftEventSerde.serialize(
          event as ev.InventoryCraftEvent
        );
      case "inventoryDyeEvent":
        return InventoryDyeEventSerde.serialize(event as ev.InventoryDyeEvent);
      case "inventoryCookEvent":
        return InventoryCookEventSerde.serialize(
          event as ev.InventoryCookEvent
        );
      case "inventoryCompostEvent":
        return InventoryCompostEventSerde.serialize(
          event as ev.InventoryCompostEvent
        );
      case "inventoryChangeSelectionEvent":
        return InventoryChangeSelectionEventSerde.serialize(
          event as ev.InventoryChangeSelectionEvent
        );
      case "changeCameraModeEvent":
        return ChangeCameraModeEventSerde.serialize(
          event as ev.ChangeCameraModeEvent
        );
      case "overflowMoveToInventoryEvent":
        return OverflowMoveToInventoryEventSerde.serialize(
          event as ev.OverflowMoveToInventoryEvent
        );
      case "inventoryMoveToOverflowEvent":
        return InventoryMoveToOverflowEventSerde.serialize(
          event as ev.InventoryMoveToOverflowEvent
        );
      case "appearanceChangeEvent":
        return AppearanceChangeEventSerde.serialize(
          event as ev.AppearanceChangeEvent
        );
      case "hairTransplantEvent":
        return HairTransplantEventSerde.serialize(
          event as ev.HairTransplantEvent
        );
      case "emoteEvent":
        return EmoteEventSerde.serialize(event as ev.EmoteEvent);
      case "startPlaceableAnimationEvent":
        return StartPlaceableAnimationEventSerde.serialize(
          event as ev.StartPlaceableAnimationEvent
        );
      case "placePlaceableEvent":
        return PlacePlaceableEventSerde.serialize(
          event as ev.PlacePlaceableEvent
        );
      case "destroyPlaceableEvent":
        return DestroyPlaceableEventSerde.serialize(
          event as ev.DestroyPlaceableEvent
        );
      case "changePictureFrameContentsEvent":
        return ChangePictureFrameContentsEventSerde.serialize(
          event as ev.ChangePictureFrameContentsEvent
        );
      case "changeTextSignContentsEvent":
        return ChangeTextSignContentsEventSerde.serialize(
          event as ev.ChangeTextSignContentsEvent
        );
      case "updateVideoSettingsEvent":
        return UpdateVideoSettingsEventSerde.serialize(
          event as ev.UpdateVideoSettingsEvent
        );
      case "sellInContainerEvent":
        return SellInContainerEventSerde.serialize(
          event as ev.SellInContainerEvent
        );
      case "purchaseFromContainerEvent":
        return PurchaseFromContainerEventSerde.serialize(
          event as ev.PurchaseFromContainerEvent
        );
      case "updateRobotNameEvent":
        return UpdateRobotNameEventSerde.serialize(
          event as ev.UpdateRobotNameEvent
        );
      case "placeRobotEvent":
        return PlaceRobotEventSerde.serialize(event as ev.PlaceRobotEvent);
      case "endPlaceRobotEvent":
        return EndPlaceRobotEventSerde.serialize(
          event as ev.EndPlaceRobotEvent
        );
      case "pickUpRobotEvent":
        return PickUpRobotEventSerde.serialize(event as ev.PickUpRobotEvent);
      case "updateProjectedRestorationEvent":
        return UpdateProjectedRestorationEventSerde.serialize(
          event as ev.UpdateProjectedRestorationEvent
        );
      case "labelChangeEvent":
        return LabelChangeEventSerde.serialize(event as ev.LabelChangeEvent);
      case "createGroupEvent":
        return CreateGroupEventSerde.serialize(event as ev.CreateGroupEvent);
      case "placeBlueprintEvent":
        return PlaceBlueprintEventSerde.serialize(
          event as ev.PlaceBlueprintEvent
        );
      case "destroyBlueprintEvent":
        return DestroyBlueprintEventSerde.serialize(
          event as ev.DestroyBlueprintEvent
        );
      case "createCraftingStationEvent":
        return CreateCraftingStationEventSerde.serialize(
          event as ev.CreateCraftingStationEvent
        );
      case "feedRobotEvent":
        return FeedRobotEventSerde.serialize(event as ev.FeedRobotEvent);
      case "placeGroupEvent":
        return PlaceGroupEventSerde.serialize(event as ev.PlaceGroupEvent);
      case "cloneGroupEvent":
        return CloneGroupEventSerde.serialize(event as ev.CloneGroupEvent);
      case "destroyGroupEvent":
        return DestroyGroupEventSerde.serialize(event as ev.DestroyGroupEvent);
      case "captureGroupEvent":
        return CaptureGroupEventSerde.serialize(event as ev.CaptureGroupEvent);
      case "unGroupEvent":
        return UnGroupEventSerde.serialize(event as ev.UnGroupEvent);
      case "repairGroupEvent":
        return RepairGroupEventSerde.serialize(event as ev.RepairGroupEvent);
      case "updateGroupPreviewEvent":
        return UpdateGroupPreviewEventSerde.serialize(
          event as ev.UpdateGroupPreviewEvent
        );
      case "deleteGroupPreviewEvent":
        return DeleteGroupPreviewEventSerde.serialize(
          event as ev.DeleteGroupPreviewEvent
        );
      case "restoreGroupEvent":
        return RestoreGroupEventSerde.serialize(event as ev.RestoreGroupEvent);
      case "restorePlaceableEvent":
        return RestorePlaceableEventSerde.serialize(
          event as ev.RestorePlaceableEvent
        );
      case "createPhotoPortalEvent":
        return CreatePhotoPortalEventSerde.serialize(
          event as ev.CreatePhotoPortalEvent
        );
      case "consumptionEvent":
        return ConsumptionEventSerde.serialize(event as ev.ConsumptionEvent);
      case "removeBuffEvent":
        return RemoveBuffEventSerde.serialize(event as ev.RemoveBuffEvent);
      case "adminInventoryGroupEvent":
        return AdminInventoryGroupEventSerde.serialize(
          event as ev.AdminInventoryGroupEvent
        );
      case "adminResetChallengesEvent":
        return AdminResetChallengesEventSerde.serialize(
          event as ev.AdminResetChallengesEvent
        );
      case "adminResetRecipeEvent":
        return AdminResetRecipeEventSerde.serialize(
          event as ev.AdminResetRecipeEvent
        );
      case "adminResetInventoryEvent":
        return AdminResetInventoryEventSerde.serialize(
          event as ev.AdminResetInventoryEvent
        );
      case "adminSetInfiniteCapacityContainerEvent":
        return AdminSetInfiniteCapacityContainerEventSerde.serialize(
          event as ev.AdminSetInfiniteCapacityContainerEvent
        );
      case "adminGiveItemEvent":
        return AdminGiveItemEventSerde.serialize(
          event as ev.AdminGiveItemEvent
        );
      case "adminRemoveItemEvent":
        return AdminRemoveItemEventSerde.serialize(
          event as ev.AdminRemoveItemEvent
        );
      case "adminDeleteEvent":
        return AdminDeleteEventSerde.serialize(event as ev.AdminDeleteEvent);
      case "adminIceEvent":
        return AdminIceEventSerde.serialize(event as ev.AdminIceEvent);
      case "playerInitEvent":
        return PlayerInitEventSerde.serialize(event as ev.PlayerInitEvent);
      case "updatePlayerHealthEvent":
        return UpdatePlayerHealthEventSerde.serialize(
          event as ev.UpdatePlayerHealthEvent
        );
      case "updateNpcHealthEvent":
        return UpdateNpcHealthEventSerde.serialize(
          event as ev.UpdateNpcHealthEvent
        );
      case "pickUpEvent":
        return PickUpEventSerde.serialize(event as ev.PickUpEvent);
      case "removeMapBeamEvent":
        return RemoveMapBeamEventSerde.serialize(
          event as ev.RemoveMapBeamEvent
        );
      case "setNUXStatusEvent":
        return SetNUXStatusEventSerde.serialize(event as ev.SetNUXStatusEvent);
      case "acceptChallengeEvent":
        return AcceptChallengeEventSerde.serialize(
          event as ev.AcceptChallengeEvent
        );
      case "completeQuestStepAtEntityEvent":
        return CompleteQuestStepAtEntityEventSerde.serialize(
          event as ev.CompleteQuestStepAtEntityEvent
        );
      case "resetChallengeEvent":
        return ResetChallengeEventSerde.serialize(
          event as ev.ResetChallengeEvent
        );
      case "expireBuffsEvent":
        return ExpireBuffsEventSerde.serialize(event as ev.ExpireBuffsEvent);
      case "expireRobotEvent":
        return ExpireRobotEventSerde.serialize(event as ev.ExpireRobotEvent);
      case "adminEditPresetEvent":
        return AdminEditPresetEventSerde.serialize(
          event as ev.AdminEditPresetEvent
        );
      case "adminSavePresetEvent":
        return AdminSavePresetEventSerde.serialize(
          event as ev.AdminSavePresetEvent
        );
      case "adminLoadPresetEvent":
        return AdminLoadPresetEventSerde.serialize(
          event as ev.AdminLoadPresetEvent
        );
      case "tillSoilEvent":
        return TillSoilEventSerde.serialize(event as ev.TillSoilEvent);
      case "plantSeedEvent":
        return PlantSeedEventSerde.serialize(event as ev.PlantSeedEvent);
      case "waterPlantsEvent":
        return WaterPlantsEventSerde.serialize(event as ev.WaterPlantsEvent);
      case "fertilizePlantEvent":
        return FertilizePlantEventSerde.serialize(
          event as ev.FertilizePlantEvent
        );
      case "adminDestroyPlantEvent":
        return AdminDestroyPlantEventSerde.serialize(
          event as ev.AdminDestroyPlantEvent
        );
      case "fishingClaimEvent":
        return FishingClaimEventSerde.serialize(event as ev.FishingClaimEvent);
      case "fishingCaughtEvent":
        return FishingCaughtEventSerde.serialize(
          event as ev.FishingCaughtEvent
        );
      case "fishingFailedEvent":
        return FishingFailedEventSerde.serialize(
          event as ev.FishingFailedEvent
        );
      case "fishingConsumeBaitEvent":
        return FishingConsumeBaitEventSerde.serialize(
          event as ev.FishingConsumeBaitEvent
        );
      case "treasureRollEvent":
        return TreasureRollEventSerde.serialize(event as ev.TreasureRollEvent);
      case "createOrJoinSpleefEvent":
        return CreateOrJoinSpleefEventSerde.serialize(
          event as ev.CreateOrJoinSpleefEvent
        );
      case "joinDeathmatchEvent":
        return JoinDeathmatchEventSerde.serialize(
          event as ev.JoinDeathmatchEvent
        );
      case "finishSimpleRaceMinigameEvent":
        return FinishSimpleRaceMinigameEventSerde.serialize(
          event as ev.FinishSimpleRaceMinigameEvent
        );
      case "startSimpleRaceMinigameEvent":
        return StartSimpleRaceMinigameEventSerde.serialize(
          event as ev.StartSimpleRaceMinigameEvent
        );
      case "reachStartSimpleRaceMinigameEvent":
        return ReachStartSimpleRaceMinigameEventSerde.serialize(
          event as ev.ReachStartSimpleRaceMinigameEvent
        );
      case "reachCheckpointSimpleRaceMinigameEvent":
        return ReachCheckpointSimpleRaceMinigameEventSerde.serialize(
          event as ev.ReachCheckpointSimpleRaceMinigameEvent
        );
      case "restartSimpleRaceMinigameEvent":
        return RestartSimpleRaceMinigameEventSerde.serialize(
          event as ev.RestartSimpleRaceMinigameEvent
        );
      case "tagMinigameHitPlayerEvent":
        return TagMinigameHitPlayerEventSerde.serialize(
          event as ev.TagMinigameHitPlayerEvent
        );
      case "quitMinigameEvent":
        return QuitMinigameEventSerde.serialize(event as ev.QuitMinigameEvent);
      case "giveMinigameKitEvent":
        return GiveMinigameKitEventSerde.serialize(
          event as ev.GiveMinigameKitEvent
        );
      case "touchMinigameStatsEvent":
        return TouchMinigameStatsEventSerde.serialize(
          event as ev.TouchMinigameStatsEvent
        );
      case "editMinigameMetadataEvent":
        return EditMinigameMetadataEventSerde.serialize(
          event as ev.EditMinigameMetadataEvent
        );
      case "minigameInstanceTickEvent":
        return MinigameInstanceTickEventSerde.serialize(
          event as ev.MinigameInstanceTickEvent
        );
      case "expireMinigameInstanceEvent":
        return ExpireMinigameInstanceEventSerde.serialize(
          event as ev.ExpireMinigameInstanceEvent
        );
      case "associateMinigameElementEvent":
        return AssociateMinigameElementEventSerde.serialize(
          event as ev.AssociateMinigameElementEvent
        );
      case "createMinigameThroughAssocationEvent":
        return CreateMinigameThroughAssocationEventSerde.serialize(
          event as ev.CreateMinigameThroughAssocationEvent
        );
      case "ackWarpEvent":
        return AckWarpEventSerde.serialize(event as ev.AckWarpEvent);
      case "replenishWateringCanEvent":
        return ReplenishWateringCanEventSerde.serialize(
          event as ev.ReplenishWateringCanEvent
        );
      case "spaceClipboardWandCutEvent":
        return SpaceClipboardWandCutEventSerde.serialize(
          event as ev.SpaceClipboardWandCutEvent
        );
      case "spaceClipboardWandCopyEvent":
        return SpaceClipboardWandCopyEventSerde.serialize(
          event as ev.SpaceClipboardWandCopyEvent
        );
      case "spaceClipboardWandPasteEvent":
        return SpaceClipboardWandPasteEventSerde.serialize(
          event as ev.SpaceClipboardWandPasteEvent
        );
      case "spaceClipboardWandDiscardEvent":
        return SpaceClipboardWandDiscardEventSerde.serialize(
          event as ev.SpaceClipboardWandDiscardEvent
        );
      case "negaWandRestoreEvent":
        return NegaWandRestoreEventSerde.serialize(
          event as ev.NegaWandRestoreEvent
        );
      case "placerWandEvent":
        return PlacerWandEventSerde.serialize(event as ev.PlacerWandEvent);
      case "clearPlacerEvent":
        return ClearPlacerEventSerde.serialize(event as ev.ClearPlacerEvent);
      case "despawnWandEvent":
        return DespawnWandEventSerde.serialize(event as ev.DespawnWandEvent);
      case "sellToEntityEvent":
        return SellToEntityEventSerde.serialize(event as ev.SellToEntityEvent);
      case "setNPCPositionEvent":
        return SetNPCPositionEventSerde.serialize(
          event as ev.SetNPCPositionEvent
        );
      case "adminUpdateInspectionTweaksEvent":
        return AdminUpdateInspectionTweaksEventSerde.serialize(
          event as ev.AdminUpdateInspectionTweaksEvent
        );
      case "createTeamEvent":
        return CreateTeamEventSerde.serialize(event as ev.CreateTeamEvent);
      case "updateTeamMetadataEvent":
        return UpdateTeamMetadataEventSerde.serialize(
          event as ev.UpdateTeamMetadataEvent
        );
      case "invitePlayerToTeamEvent":
        return InvitePlayerToTeamEventSerde.serialize(
          event as ev.InvitePlayerToTeamEvent
        );
      case "requestToJoinTeamEvent":
        return RequestToJoinTeamEventSerde.serialize(
          event as ev.RequestToJoinTeamEvent
        );
      case "requestedToJoinTeamEvent":
        return RequestedToJoinTeamEventSerde.serialize(
          event as ev.RequestedToJoinTeamEvent
        );
      case "cancelRequestToJoinTeamEvent":
        return CancelRequestToJoinTeamEventSerde.serialize(
          event as ev.CancelRequestToJoinTeamEvent
        );
      case "respondToJoinTeamRequestEvent":
        return RespondToJoinTeamRequestEventSerde.serialize(
          event as ev.RespondToJoinTeamRequestEvent
        );
      case "requestToJoinTeamAcceptedEvent":
        return RequestToJoinTeamAcceptedEventSerde.serialize(
          event as ev.RequestToJoinTeamAcceptedEvent
        );
      case "joinTeamEvent":
        return JoinTeamEventSerde.serialize(event as ev.JoinTeamEvent);
      case "cancelTeamInviteEvent":
        return CancelTeamInviteEventSerde.serialize(
          event as ev.CancelTeamInviteEvent
        );
      case "kickTeamMemberEvent":
        return KickTeamMemberEventSerde.serialize(
          event as ev.KickTeamMemberEvent
        );
      case "declineTeamInviteEvent":
        return DeclineTeamInviteEventSerde.serialize(
          event as ev.DeclineTeamInviteEvent
        );
      case "quitTeamEvent":
        return QuitTeamEventSerde.serialize(event as ev.QuitTeamEvent);
      case "beginTradeEvent":
        return BeginTradeEventSerde.serialize(event as ev.BeginTradeEvent);
      case "acceptTradeEvent":
        return AcceptTradeEventSerde.serialize(event as ev.AcceptTradeEvent);
      case "changeTradeOfferEvent":
        return ChangeTradeOfferEventSerde.serialize(
          event as ev.ChangeTradeOfferEvent
        );
      case "expireTradeEvent":
        return ExpireTradeEventSerde.serialize(event as ev.ExpireTradeEvent);
      case "giveGiftEvent":
        return GiveGiftEventSerde.serialize(event as ev.GiveGiftEvent);
      case "giveMailboxItemEvent":
        return GiveMailboxItemEventSerde.serialize(
          event as ev.GiveMailboxItemEvent
        );
      case "unwrapWrappedItemEvent":
        return UnwrapWrappedItemEventSerde.serialize(
          event as ev.UnwrapWrappedItemEvent
        );
      case "pokePlantEvent":
        return PokePlantEventSerde.serialize(event as ev.PokePlantEvent);
      case "addToOutfitEvent":
        return AddToOutfitEventSerde.serialize(event as ev.AddToOutfitEvent);
      case "equipOutfitEvent":
        return EquipOutfitEventSerde.serialize(event as ev.EquipOutfitEvent);
    }
  }

  static deserialize(data: any): ev.Event {
    const kind = data.kind as string;
    switch (kind) {
      case "disconnectPlayerEvent":
        return DisconnectPlayerEventSerde.deserialize(data);
      case "moveEvent":
        return MoveEventSerde.deserialize(data);
      case "idleChangeEvent":
        return IdleChangeEventSerde.deserialize(data);
      case "enterRobotFieldEvent":
        return EnterRobotFieldEventSerde.deserialize(data);
      case "warpEvent":
        return WarpEventSerde.deserialize(data);
      case "warpHomeEvent":
        return WarpHomeEventSerde.deserialize(data);
      case "editEvent":
        return EditEventSerde.deserialize(data);
      case "shapeEvent":
        return ShapeEventSerde.deserialize(data);
      case "farmingEvent":
        return FarmingEventSerde.deserialize(data);
      case "dumpWaterEvent":
        return DumpWaterEventSerde.deserialize(data);
      case "scoopWaterEvent":
        return ScoopWaterEventSerde.deserialize(data);
      case "inventoryCombineEvent":
        return InventoryCombineEventSerde.deserialize(data);
      case "inventorySplitEvent":
        return InventorySplitEventSerde.deserialize(data);
      case "inventorySortEvent":
        return InventorySortEventSerde.deserialize(data);
      case "inventorySwapEvent":
        return InventorySwapEventSerde.deserialize(data);
      case "robotInventorySwapEvent":
        return RobotInventorySwapEventSerde.deserialize(data);
      case "inventoryThrowEvent":
        return InventoryThrowEventSerde.deserialize(data);
      case "inventoryDestroyEvent":
        return InventoryDestroyEventSerde.deserialize(data);
      case "dyeBlockEvent":
        return DyeBlockEventSerde.deserialize(data);
      case "unmuckerEvent":
        return UnmuckerEventSerde.deserialize(data);
      case "internalInventorySetEvent":
        return InternalInventorySetEventSerde.deserialize(data);
      case "inventoryCraftEvent":
        return InventoryCraftEventSerde.deserialize(data);
      case "inventoryDyeEvent":
        return InventoryDyeEventSerde.deserialize(data);
      case "inventoryCookEvent":
        return InventoryCookEventSerde.deserialize(data);
      case "inventoryCompostEvent":
        return InventoryCompostEventSerde.deserialize(data);
      case "inventoryChangeSelectionEvent":
        return InventoryChangeSelectionEventSerde.deserialize(data);
      case "changeCameraModeEvent":
        return ChangeCameraModeEventSerde.deserialize(data);
      case "overflowMoveToInventoryEvent":
        return OverflowMoveToInventoryEventSerde.deserialize(data);
      case "inventoryMoveToOverflowEvent":
        return InventoryMoveToOverflowEventSerde.deserialize(data);
      case "appearanceChangeEvent":
        return AppearanceChangeEventSerde.deserialize(data);
      case "hairTransplantEvent":
        return HairTransplantEventSerde.deserialize(data);
      case "emoteEvent":
        return EmoteEventSerde.deserialize(data);
      case "startPlaceableAnimationEvent":
        return StartPlaceableAnimationEventSerde.deserialize(data);
      case "placePlaceableEvent":
        return PlacePlaceableEventSerde.deserialize(data);
      case "destroyPlaceableEvent":
        return DestroyPlaceableEventSerde.deserialize(data);
      case "changePictureFrameContentsEvent":
        return ChangePictureFrameContentsEventSerde.deserialize(data);
      case "changeTextSignContentsEvent":
        return ChangeTextSignContentsEventSerde.deserialize(data);
      case "updateVideoSettingsEvent":
        return UpdateVideoSettingsEventSerde.deserialize(data);
      case "sellInContainerEvent":
        return SellInContainerEventSerde.deserialize(data);
      case "purchaseFromContainerEvent":
        return PurchaseFromContainerEventSerde.deserialize(data);
      case "updateRobotNameEvent":
        return UpdateRobotNameEventSerde.deserialize(data);
      case "placeRobotEvent":
        return PlaceRobotEventSerde.deserialize(data);
      case "endPlaceRobotEvent":
        return EndPlaceRobotEventSerde.deserialize(data);
      case "pickUpRobotEvent":
        return PickUpRobotEventSerde.deserialize(data);
      case "updateProjectedRestorationEvent":
        return UpdateProjectedRestorationEventSerde.deserialize(data);
      case "labelChangeEvent":
        return LabelChangeEventSerde.deserialize(data);
      case "createGroupEvent":
        return CreateGroupEventSerde.deserialize(data);
      case "placeBlueprintEvent":
        return PlaceBlueprintEventSerde.deserialize(data);
      case "destroyBlueprintEvent":
        return DestroyBlueprintEventSerde.deserialize(data);
      case "createCraftingStationEvent":
        return CreateCraftingStationEventSerde.deserialize(data);
      case "feedRobotEvent":
        return FeedRobotEventSerde.deserialize(data);
      case "placeGroupEvent":
        return PlaceGroupEventSerde.deserialize(data);
      case "cloneGroupEvent":
        return CloneGroupEventSerde.deserialize(data);
      case "destroyGroupEvent":
        return DestroyGroupEventSerde.deserialize(data);
      case "captureGroupEvent":
        return CaptureGroupEventSerde.deserialize(data);
      case "unGroupEvent":
        return UnGroupEventSerde.deserialize(data);
      case "repairGroupEvent":
        return RepairGroupEventSerde.deserialize(data);
      case "updateGroupPreviewEvent":
        return UpdateGroupPreviewEventSerde.deserialize(data);
      case "deleteGroupPreviewEvent":
        return DeleteGroupPreviewEventSerde.deserialize(data);
      case "restoreGroupEvent":
        return RestoreGroupEventSerde.deserialize(data);
      case "restorePlaceableEvent":
        return RestorePlaceableEventSerde.deserialize(data);
      case "createPhotoPortalEvent":
        return CreatePhotoPortalEventSerde.deserialize(data);
      case "consumptionEvent":
        return ConsumptionEventSerde.deserialize(data);
      case "removeBuffEvent":
        return RemoveBuffEventSerde.deserialize(data);
      case "adminInventoryGroupEvent":
        return AdminInventoryGroupEventSerde.deserialize(data);
      case "adminResetChallengesEvent":
        return AdminResetChallengesEventSerde.deserialize(data);
      case "adminResetRecipeEvent":
        return AdminResetRecipeEventSerde.deserialize(data);
      case "adminResetInventoryEvent":
        return AdminResetInventoryEventSerde.deserialize(data);
      case "adminSetInfiniteCapacityContainerEvent":
        return AdminSetInfiniteCapacityContainerEventSerde.deserialize(data);
      case "adminGiveItemEvent":
        return AdminGiveItemEventSerde.deserialize(data);
      case "adminRemoveItemEvent":
        return AdminRemoveItemEventSerde.deserialize(data);
      case "adminDeleteEvent":
        return AdminDeleteEventSerde.deserialize(data);
      case "adminIceEvent":
        return AdminIceEventSerde.deserialize(data);
      case "playerInitEvent":
        return PlayerInitEventSerde.deserialize(data);
      case "updatePlayerHealthEvent":
        return UpdatePlayerHealthEventSerde.deserialize(data);
      case "updateNpcHealthEvent":
        return UpdateNpcHealthEventSerde.deserialize(data);
      case "pickUpEvent":
        return PickUpEventSerde.deserialize(data);
      case "removeMapBeamEvent":
        return RemoveMapBeamEventSerde.deserialize(data);
      case "setNUXStatusEvent":
        return SetNUXStatusEventSerde.deserialize(data);
      case "acceptChallengeEvent":
        return AcceptChallengeEventSerde.deserialize(data);
      case "completeQuestStepAtEntityEvent":
        return CompleteQuestStepAtEntityEventSerde.deserialize(data);
      case "resetChallengeEvent":
        return ResetChallengeEventSerde.deserialize(data);
      case "expireBuffsEvent":
        return ExpireBuffsEventSerde.deserialize(data);
      case "expireRobotEvent":
        return ExpireRobotEventSerde.deserialize(data);
      case "adminEditPresetEvent":
        return AdminEditPresetEventSerde.deserialize(data);
      case "adminSavePresetEvent":
        return AdminSavePresetEventSerde.deserialize(data);
      case "adminLoadPresetEvent":
        return AdminLoadPresetEventSerde.deserialize(data);
      case "tillSoilEvent":
        return TillSoilEventSerde.deserialize(data);
      case "plantSeedEvent":
        return PlantSeedEventSerde.deserialize(data);
      case "waterPlantsEvent":
        return WaterPlantsEventSerde.deserialize(data);
      case "fertilizePlantEvent":
        return FertilizePlantEventSerde.deserialize(data);
      case "adminDestroyPlantEvent":
        return AdminDestroyPlantEventSerde.deserialize(data);
      case "fishingClaimEvent":
        return FishingClaimEventSerde.deserialize(data);
      case "fishingCaughtEvent":
        return FishingCaughtEventSerde.deserialize(data);
      case "fishingFailedEvent":
        return FishingFailedEventSerde.deserialize(data);
      case "fishingConsumeBaitEvent":
        return FishingConsumeBaitEventSerde.deserialize(data);
      case "treasureRollEvent":
        return TreasureRollEventSerde.deserialize(data);
      case "createOrJoinSpleefEvent":
        return CreateOrJoinSpleefEventSerde.deserialize(data);
      case "joinDeathmatchEvent":
        return JoinDeathmatchEventSerde.deserialize(data);
      case "finishSimpleRaceMinigameEvent":
        return FinishSimpleRaceMinigameEventSerde.deserialize(data);
      case "startSimpleRaceMinigameEvent":
        return StartSimpleRaceMinigameEventSerde.deserialize(data);
      case "reachStartSimpleRaceMinigameEvent":
        return ReachStartSimpleRaceMinigameEventSerde.deserialize(data);
      case "reachCheckpointSimpleRaceMinigameEvent":
        return ReachCheckpointSimpleRaceMinigameEventSerde.deserialize(data);
      case "restartSimpleRaceMinigameEvent":
        return RestartSimpleRaceMinigameEventSerde.deserialize(data);
      case "tagMinigameHitPlayerEvent":
        return TagMinigameHitPlayerEventSerde.deserialize(data);
      case "quitMinigameEvent":
        return QuitMinigameEventSerde.deserialize(data);
      case "giveMinigameKitEvent":
        return GiveMinigameKitEventSerde.deserialize(data);
      case "touchMinigameStatsEvent":
        return TouchMinigameStatsEventSerde.deserialize(data);
      case "editMinigameMetadataEvent":
        return EditMinigameMetadataEventSerde.deserialize(data);
      case "minigameInstanceTickEvent":
        return MinigameInstanceTickEventSerde.deserialize(data);
      case "expireMinigameInstanceEvent":
        return ExpireMinigameInstanceEventSerde.deserialize(data);
      case "associateMinigameElementEvent":
        return AssociateMinigameElementEventSerde.deserialize(data);
      case "createMinigameThroughAssocationEvent":
        return CreateMinigameThroughAssocationEventSerde.deserialize(data);
      case "ackWarpEvent":
        return AckWarpEventSerde.deserialize(data);
      case "replenishWateringCanEvent":
        return ReplenishWateringCanEventSerde.deserialize(data);
      case "spaceClipboardWandCutEvent":
        return SpaceClipboardWandCutEventSerde.deserialize(data);
      case "spaceClipboardWandCopyEvent":
        return SpaceClipboardWandCopyEventSerde.deserialize(data);
      case "spaceClipboardWandPasteEvent":
        return SpaceClipboardWandPasteEventSerde.deserialize(data);
      case "spaceClipboardWandDiscardEvent":
        return SpaceClipboardWandDiscardEventSerde.deserialize(data);
      case "negaWandRestoreEvent":
        return NegaWandRestoreEventSerde.deserialize(data);
      case "placerWandEvent":
        return PlacerWandEventSerde.deserialize(data);
      case "clearPlacerEvent":
        return ClearPlacerEventSerde.deserialize(data);
      case "despawnWandEvent":
        return DespawnWandEventSerde.deserialize(data);
      case "sellToEntityEvent":
        return SellToEntityEventSerde.deserialize(data);
      case "setNPCPositionEvent":
        return SetNPCPositionEventSerde.deserialize(data);
      case "adminUpdateInspectionTweaksEvent":
        return AdminUpdateInspectionTweaksEventSerde.deserialize(data);
      case "createTeamEvent":
        return CreateTeamEventSerde.deserialize(data);
      case "updateTeamMetadataEvent":
        return UpdateTeamMetadataEventSerde.deserialize(data);
      case "invitePlayerToTeamEvent":
        return InvitePlayerToTeamEventSerde.deserialize(data);
      case "requestToJoinTeamEvent":
        return RequestToJoinTeamEventSerde.deserialize(data);
      case "requestedToJoinTeamEvent":
        return RequestedToJoinTeamEventSerde.deserialize(data);
      case "cancelRequestToJoinTeamEvent":
        return CancelRequestToJoinTeamEventSerde.deserialize(data);
      case "respondToJoinTeamRequestEvent":
        return RespondToJoinTeamRequestEventSerde.deserialize(data);
      case "requestToJoinTeamAcceptedEvent":
        return RequestToJoinTeamAcceptedEventSerde.deserialize(data);
      case "joinTeamEvent":
        return JoinTeamEventSerde.deserialize(data);
      case "cancelTeamInviteEvent":
        return CancelTeamInviteEventSerde.deserialize(data);
      case "kickTeamMemberEvent":
        return KickTeamMemberEventSerde.deserialize(data);
      case "declineTeamInviteEvent":
        return DeclineTeamInviteEventSerde.deserialize(data);
      case "quitTeamEvent":
        return QuitTeamEventSerde.deserialize(data);
      case "beginTradeEvent":
        return BeginTradeEventSerde.deserialize(data);
      case "acceptTradeEvent":
        return AcceptTradeEventSerde.deserialize(data);
      case "changeTradeOfferEvent":
        return ChangeTradeOfferEventSerde.deserialize(data);
      case "expireTradeEvent":
        return ExpireTradeEventSerde.deserialize(data);
      case "giveGiftEvent":
        return GiveGiftEventSerde.deserialize(data);
      case "giveMailboxItemEvent":
        return GiveMailboxItemEventSerde.deserialize(data);
      case "unwrapWrappedItemEvent":
        return UnwrapWrappedItemEventSerde.deserialize(data);
      case "pokePlantEvent":
        return PokePlantEventSerde.deserialize(data);
      case "addToOutfitEvent":
        return AddToOutfitEventSerde.deserialize(data);
      case "equipOutfitEvent":
        return EquipOutfitEventSerde.deserialize(data);
      default:
        throw new Error(`Unknown event kind: ${kind}`);
    }
  }
}
