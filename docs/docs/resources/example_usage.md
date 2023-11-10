---
sidebar_position: 2
---

# Example Usage

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

function addExampleResources(builder: ExampleResourcesBuilder) {
  // Define a global resource.
  builder.addGlobal("/clock", { time: secondsSinceEpoch() });
  builder.add("/player", genPlayerResource);
  builder.add("/player/health", { health: 100, maxHealth: 100 });
  builder.add("/player/position", { position: [0, 0, 0] });
}
```

### Accessing resources

> _Note: The same can be done using `ExampleReactResources`_.

Resources are accessed using the `get()` method.

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

Resources are updated using the `set()` method.

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

### Using resources within React

If you want a resource update to trigger a react component to re-render, use the `use()` method on
`ReactResources`. `ReactResources` can be accessed from within all game components, through the `ClientContext`.

```tsx
const PlayerHealth: React.FC<{ playerId: BiomesId }> = ({ playerId }) => {
  const { reactResources, userId } = useClientContext();
  // Updates to this player's "/player/health" will cause a re-render.
  const { health, maxHealth } = reactResources.use("/player/health", playerId);

  return (
    <div>
      <h1>{`${health}/${maxHealth}`}</h1>
    </div>
  );
};
```
