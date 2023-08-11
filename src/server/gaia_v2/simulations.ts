import type { GaiaServerContext } from "@/server/gaia_v2/context";
import type {
  Simulation,
  SimulationName,
} from "@/server/gaia_v2/simulations/api";
import { FarmingSimulation } from "@/server/gaia_v2/simulations/farming";
import { FloraDecaySimulation } from "@/server/gaia_v2/simulations/flora_decay";
import { FloraGrowthSimulation } from "@/server/gaia_v2/simulations/flora_growth";
import { FloraMuckSimulation } from "@/server/gaia_v2/simulations/flora_muck";
import { IrradianceSimulation } from "@/server/gaia_v2/simulations/irradiance";
import { LeafGrowthSimulation } from "@/server/gaia_v2/simulations/leaf_growth";
import { LifetimeSimulation } from "@/server/gaia_v2/simulations/lifetime";
import { MuckSimulation } from "@/server/gaia_v2/simulations/muck";
import { OreGrowthSimulation } from "@/server/gaia_v2/simulations/ore_growth";
import { RestorationSimulation } from "@/server/gaia_v2/simulations/restoration";
import { SkyOcclusionSimulation } from "@/server/gaia_v2/simulations/sky_occlusion";
import { TreeGrowthSimulation } from "@/server/gaia_v2/simulations/tree_growth";
import { WaterSimulation } from "@/server/gaia_v2/simulations/water";
import type { RegistryLoader } from "@/shared/registry";
import { compactMap } from "@/shared/util/collections";

export async function registerSimulations<C extends GaiaServerContext>(
  loader: RegistryLoader<C>
): Promise<Simulation[]> {
  const [clock, config, replica, map, voxeloo, idGenerator] = await Promise.all(
    [
      loader.get("clock"),
      loader.get("config"),
      loader.get("replica"),
      loader.get("terrainMap"),
      loader.get("voxeloo"),
      loader.get("idGenerator"),
    ]
  );

  const SIMULATIONS = <
    {
      [K in SimulationName]: () => Simulation;
    }
  >{
    farming: () => new FarmingSimulation(voxeloo, replica.table, idGenerator),
    flora_decay: () => new FloraDecaySimulation(voxeloo, replica),
    flora_growth: () => new FloraGrowthSimulation(voxeloo, replica, clock),
    flora_muck: () => new FloraMuckSimulation(voxeloo, replica),
    irradiance: () => new IrradianceSimulation(voxeloo, replica, map),
    leaf_growth: () => new LeafGrowthSimulation(voxeloo, replica, clock),
    lifetime: () => new LifetimeSimulation(voxeloo, replica, clock),
    muck: () => new MuckSimulation(voxeloo, replica),
    ore_growth: () => new OreGrowthSimulation(voxeloo, replica, clock),
    restoration: () => new RestorationSimulation(voxeloo, replica),
    sky_occlusion: () => new SkyOcclusionSimulation(voxeloo, replica, map),
    tree_growth: () => new TreeGrowthSimulation(voxeloo, replica, clock),
    water: () => new WaterSimulation(voxeloo, replica, map),
  };

  return compactMap(config.simulations, (name) => {
    return SIMULATIONS[name]?.();
  });
}
