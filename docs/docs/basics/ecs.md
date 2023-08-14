---
sidebar_position: 4
---

# Entity Component System (ECS)

[ECS](https://github.com/ill-inc/biomes-game/tree/main/src/shared/ecs), or [Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system), is the system Biomes uses to store **dynamic** data in game. ([Bikkie](./bikkie.md) is the system for static data).

## ECS schemas

ECS schemas are defined in Python, in [`src/ecs/defs.py`](https://github.com/ill-inc/biomes-game/tree/main/ecs/defs.py).

These definitions are code-genned into TypeScript definitions that live in `src/shared/ecs/gen`.

A single Entity, such as a Player or NPC, is made up of many reusable components such as an Inventory or Position. Multiple different types of Entities will share different sets of components.

In addition to data definitions, we also define:

- ECS events that players (and privileged services) may send as events to the [logic server](./server-overview)
- Selectors to select groups of components at once

## Updating schemas

Run `./b gen:ecs` to update ECS definitions after updating a schema.
