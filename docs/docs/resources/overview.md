---
sidebar_position: 1
---

# Overview

## Problem

Biomes is a [Next.js](https://nextjs.org/) app with a [Three.js](https://threejs.org/) renderer.
React uses react state to manage resources, and Three.js doesn't have an out-of-the box solution for state management,
typically refreshing a Three.js app will reset the scene.

There a few problems here:

1. How to persist Three.js game state.
2. How to update React state when the Three.js game state changes, triggering a rerender.
3. How to update the Three.js game state when the React state changes.

Moreover, there is the problem of defining dependencies between resources. For instance, we may want to change
the player's appearance if their health is below a certain point. In this example, the player's appearance
depends on the player's health - updating the player health _may_ cause the player's appearance to change.

## Resource System

The resource system was created to solves these problems, and is composed of a few components, the main ones being:

1. `BiomesResourcesBuilder`: Use to define resources.
2. `TypedResourceDeps`: Used to define dependencies between resources.
3. `TypedResources`: Use to access resources.
4. `ReactResources`: Use to access resources from within React components.
5. `ResourcePaths`: Typed resource keys with paths that define arguments for lookups.

## Example Usage

### Defining resource paths

```typescript
interface Health {
  health: number;
  maxHealth: number;
}

interface PlayerResource {
  health: Health;
  position: Vec3;
}

interface ExampleResourcePaths {
  // Players are looked up by their BiomesId.
  "/player": PathDef<[BiomesId], PlayerResource>;
  "/player/health": PathDef<[BiomesId], Health>;
  "/player/position": PathDef<[BiomesId], { position: Vec3 }>;
  // The clock has no parameters.
  "/clock": PathDef<[], { time: number }>;
}
```

### Defining components

```ts
type ExampleResourcesBuilder = BiomesResourcesBuilder<ExampleResourcePaths>;
type ExampleResourceDeps = TypedResourceDeps<ExampleResourcePaths>;
type ExampleResources = TypedResources<ExampleResourcePaths>;
type ExampleReactResources = ReactResources<ExampleResourcePaths>;
```

### Building resources

```ts
function genPlayerResource(deps: ExampleResourceDeps, id: BiomesId) {
  // Calling deps.get() here creates a dependency between
  // "/player" and "/player/health" + "/player/position".
  // Whenever the dependencies update, this generator function will rerun.
  const health = deps.get("/player/health", id);
  const { position } = deps.get("/player/position", id);

  return {
    health,
    position,
  };
}

function addNpcResources(builder: ExampleResourcesBuilder) {
  // Define a global resource.
  builder.addGlobal("/clock", { time: secondsSinceEpoch() });
  builder.add("/player", genPlayerResource);
  builder.add("/player/health", { health: 100, maxHealth: 100 });
  builder.add("/player/position", { position: [0, 0, 0] });
}
```

### Accessing resources

> _Note: The same can be done using `ExampleReactResources`_.

```ts
function healthBarColor(resources: ExampleResources, id: BiomesId): string {
  const { health, maxHealth } = resources.get("/player/health", id);
  const healthPercentage = Math.round((health / maxHealth) * 100);
  if (healthPercentage >= 80) {
    return "GREEN";
  } else if (healthPercentage >= 50) {
    return "YELLOW";
  } else if (healthPercentage > 0) {
    return "RED";
  } else {
    return "BLACK";
  }
}
```

### Updating resources

> _Note: The same can be done using `ExampleReactResources`_.

```ts
const JUMP_POWER = 10;

function jump(resources: ExampleResources, id: BiomesId) {
  const { position } = resources.get("/player/position", id);
  // Perform a realistic jump.
  resources.set("/player/position", id, {
    position: [position[0], position[1] + JUMP_POWER, position[2]],
  });
}
```
