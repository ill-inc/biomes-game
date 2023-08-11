#include "voxeloo/gaia/light.hpp"

#include <bitset>
#include <memory>

#include "prometheus/counter.h"
#include "voxeloo/common/format.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/hashing.hpp"
#include "voxeloo/common/metrics.hpp"
#include "voxeloo/gaia/timer.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/tensors/buffers.hpp"

namespace voxeloo::gaia {

namespace {

auto& sky_occlusion_update_ms =
    prometheus::BuildGauge()
        .Name("gaia_light_cpp_sky_occlusion_update_ms")
        .Help("Duration per sky-occlusion map column update.")
        .Register(metrics::registry())
        .Add({});

auto& irradiance_update_ms =
    prometheus::BuildGauge()
        .Name("gaia_light_cpp_irradiance_update_ms")
        .Help("Duration per irradiance map update (queue completion).")
        .Register(metrics::registry())
        .Add({});

static constexpr uint8_t kMaxIntensity = 15;
static constexpr uint8_t kMaxOcclusion = 15;
static constexpr uint8_t kOcclusionStep = 1;

using TerrainArray = tensors::Array<TerrainId>;

auto is_occlusive(TerrainId id) {
  return id != 0 && galois::terrain::is_block_id(id);
}

template <typename T>
auto reverse(const tensors::Array<T>& array) {
  auto n = array.data.size();

  // Build up the pairs of positions and their values.
  tensors::MultiBufferBuilder<tensors::ArrayPos, T> builder(n);
  scan(array, [&](auto run, auto val) {
    builder.add(run.len, val);
  });
  auto [lens, vals] = std::move(builder).build();

  // Create a new array from the reversed pairs.
  tensors::ArrayBuilder<T> out(n);
  for (auto i = 0; i < n; i += 1) {
    out.add(lens[n - i - 1], vals[n - i - 1]);
  }
  return std::move(out).build();
}

auto to_occlusion_shard(const TerrainMap& terrain, Vec3i pos) {
  return tensors::merge(
      terrain.seed_chunk(pos)->array,
      terrain.diff_chunk(pos)->array,
      [](auto t1, auto t2) {
        return is_occlusive(t2.value_or(t1));
      });
}

auto is_empty(const TerrainMap& terrain, Vec3i pos) {
  auto diff_occlusive = [&](auto id) {
    return is_occlusive(id.value_or(0));
  };
  if (tensors::any(terrain.diff_chunk(pos)->array, diff_occlusive)) {
    return false;
  }
  if (tensors::any(terrain.seed_chunk(pos)->array, is_occlusive)) {
    return false;
  }
  return true;
}

void initialize_sky_occlusion_column(
    Vec2i column, const TerrainMap& terrain, SkyOcclusionWriter& writer) {
  auto [sx, sz] = column;
  auto [v0, v1] = terrain.aabb();

  auto step = static_cast<int>(tensors::kChunkDim);
  auto sy = v1.y - step;

  // Emit all of the empty non-occlusive shards.
  for (; is_empty(terrain, {sx, sy, sz}); sy -= step) {
    writer.update({sx, sy, sz}, tensors::make_chunk<uint8_t>(0));
  }

  static const auto layer_size = tensors::kChunkDim * tensors::kChunkDim;

  // Emit shards until every voxel column is occluded.
  std::bitset<layer_size> prev;
  for (; !prev.all() && sy >= v0.y; sy -= step) {
    auto src = reverse(to_occlusion_shard(terrain, {sx, sy, sz}));
    auto dst = tensors::map_dense(src, [&](auto pos, auto id) {
      auto i = pos % layer_size;
      if (is_occlusive(id)) {
        prev[i] = true;
      }
      return static_cast<uint8_t>(prev[i] ? kMaxOcclusion : 0);
    });
    writer.update({sx, sy, sz}, tensors::Chunk(reverse(dst)));
  }

  // Emit the final shards that are fully occluded.
  for (; sy >= v0.y; sy -= step) {
    writer.update({sx, sy, sz}, tensors::make_chunk<uint8_t>(kMaxOcclusion));
  }
}

void schedule_sky_occlusion_column(
    Vec2i column,
    const TerrainMap& terrain,
    SkyOcclusionMap& map,
    SkyOcclusionWriter& writer,
    Queue<Vec3i>& queue) {
  auto [sx, sz] = column;
  auto [v0, v1] = terrain.aabb();

  auto step = static_cast<int>(tensors::kChunkDim);
  auto sy = v1.y - step;

  // Skip over all fully non-occlusive shards.
  for (; is_empty(terrain, {sx, sy, sz}); sy -= step) {
  }

  auto get_default = [&](Vec3i pos) {
    return map.contains(pos) ? map.get(pos) : kMaxOcclusion;
  };

  // Identify all occlusive voxels with at least one non-occlusive neighbor.
  for (; sy >= v0.y; sy -= step) {
    auto origin = vec3(sx, sy, sz);
    tensors::scan(map.chunk(origin)->array, [&](auto run, auto so) {
      if (so != kMaxOcclusion) {
        return;
      }
      for (auto i = run.pos; i < run.pos + run.len; i += 1) {
        auto pos = origin + to<int>(tensors::decode_tensor_pos(i));
        if (i == run.pos) {
          if (get_default(pos - vec3(1, 0, 0)) == 0) {
            queue.push(pos);
            continue;
          }
        }
        if (i == run.pos + run.len - 1) {
          if (get_default(pos + vec3(1, 0, 0)) == 0) {
            queue.push(pos);
            continue;
          }
        }
        auto z_neg = get_default(pos - vec3(0, 0, 1)) == 0;
        auto z_pos = get_default(pos + vec3(0, 0, 1)) == 0;
        if (z_neg || z_pos) {
          queue.push(pos);
        }
      }
    });
  }
}

auto emissiveness_old(TerrainId id, uint8_t dye) {
  // TODO(matthew): Make this use terrain quirks after they has been
  // migrated to bikkie
  switch (id) {
    // led
    case 64:
      switch (dye) {
        // none
        case 0:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // blue
        case 1:
          return Vec4<uint8_t>{3, 3, 15, 0};

        // red
        case 2:
          return Vec4<uint8_t>{15, 3, 3, 0};

        // green
        case 3:
          return Vec4<uint8_t>{3, 15, 3, 0};

        // orange
        case 4:
          return Vec4<uint8_t>{15, 8, 2, 0};

        // white
        case 5:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // purple
        case 6:
          return Vec4<uint8_t>{9, 5, 15, 0};

        // pink
        case 7:
          return Vec4<uint8_t>{15, 6, 15, 0};

        // yellow
        case 8:
          return Vec4<uint8_t>{15, 15, 0, 0};

        // black
        case 9:
          return Vec4<uint8_t>{10, 1, 15, 0};

        // tan
        case 10:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // brown
        case 11:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // silver
        case 12:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // cyan
        case 13:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // magenta
        case 14:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // brightgreen
        case 15:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // brightred
        case 16:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // brightpurple
        case 17:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // brightpink
        case 18:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // brightyellow
        case 19:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // brightblue
        case 20:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // brightorange
        case 21:
          return Vec4<uint8_t>{15, 15, 15, 0};

        // lightblue
        case 22:
          return Vec4<uint8_t>{15, 15, 15, 0};
      };

    // emberstone
    case 65:
      return Vec4<uint8_t>{15, 6, 5, 0};

    // sunstone
    case 66:
      return Vec4<uint8_t>{15, 12, 3, 0};

    // moonstone
    case 67:
      return Vec4<uint8_t>{14, 14, 15, 0};

    // flare
    case 16777231:
      return Vec4<uint8_t>{kMaxIntensity, kMaxIntensity, kMaxIntensity, 0};

    default:
      return Vec4<uint8_t>{};
  };
}

auto is_emissive(TerrainId id) {
  return emissiveness_old(id, 0) != Vec4<uint8_t>{0, 0, 0, 0};
}

auto sky_radius(Vec3i change) {
  static const auto max_light_radius = Vec3<int>{
      kMaxOcclusion,
      kMaxOcclusion,
      kMaxOcclusion,
  };
  return voxels::Box{
      {change - max_light_radius},
      {change + max_light_radius + 1},
  };
}

auto to_shard_pos(Vec3i pos) {
  static const auto k = static_cast<int>(tensors::kChunkDim);
  return k * floor_div(pos, k);
};

}  // namespace

void process_sky_occlusion_queue(
    const TerrainMap& terrain,
    SkyOcclusionMap& sky_occlusion,
    SkyOcclusionWriter& signaler,
    Queue<Vec3i>& queue) {
  auto push_if = [&](bool condition, Vec3i pos) {
    if (condition) {
      queue.push(pos);
    }
  };

  ShardWriter<uint8_t> sparse_writer(sky_occlusion);

  auto get_default = [&](Vec3i pos) {
    return sky_occlusion.contains(pos) ? sparse_writer.get(pos) : kMaxOcclusion;
  };

  while (!queue.empty()) {
    auto pos = queue.pop();
    if (!sky_occlusion.contains(pos)) {
      continue;
    }
    if (is_occlusive(terrain.get(pos))) {
      continue;
    }

    // Fetch the neighbors occlusive values.
    auto x_neg = get_default(pos - vec3(1, 0, 0));
    auto x_pos = get_default(pos + vec3(1, 0, 0));
    auto y_neg = get_default(pos - vec3(0, 1, 0));
    auto y_pos = get_default(pos + vec3(0, 1, 0));
    auto z_neg = get_default(pos - vec3(0, 0, 1));
    auto z_pos = get_default(pos + vec3(0, 0, 1));
    auto d_min = std::min({x_neg, x_pos, y_neg, y_pos, z_neg, z_pos});

    // Determine the local occlusive value from the neighbors.
    auto old_val = sparse_writer.get(pos);
    auto new_val = std::min<uint8_t>(kMaxOcclusion, d_min + kOcclusionStep);

    // We update the current voxel's irradiance value based on its neighbors.
    if (old_val > new_val) {
      sparse_writer.set(pos, new_val);
    } else {
      continue;
    }

    // Recurse on each neighbor that _might_ require an update.
    push_if(x_neg > new_val + kOcclusionStep, pos - vec3(1, 0, 0));
    push_if(x_pos > new_val + kOcclusionStep, pos + vec3(1, 0, 0));
    push_if(y_neg > new_val + kOcclusionStep, pos - vec3(0, 1, 0));
    push_if(y_pos > new_val + kOcclusionStep, pos + vec3(0, 1, 0));
    push_if(z_neg > new_val + kOcclusionStep, pos - vec3(0, 0, 1));
    push_if(z_pos > new_val + kOcclusionStep, pos + vec3(0, 0, 1));
  }

  for (auto pos : sparse_writer.flush()) {
    signaler.signal(pos);
  }
}

void process_irradiance_queue(
    const TerrainMap& terrain,
    IrradianceMap& irradiance,
    IrradianceWriter& signaler,
    Queue<Vec3i>& queue) {
  auto push_if = [&](bool condition, Vec3i pos) {
    if (condition) {
      queue.push(pos);
    }
  };

  ShardWriter<Vec4<uint8_t>> sparse_writer(irradiance);

  auto get_default = [&](Vec3i pos) {
    return irradiance.contains(pos) ? sparse_writer.get(pos) : Vec4<uint8_t>{};
  };

  while (!queue.empty()) {
    auto pos = queue.pop();
    if (!irradiance.contains(pos)) {
      continue;
    }

    // Fetch the neighbors occlusive values.
    auto x_neg = get_default(pos - vec3(1, 0, 0));
    auto x_pos = get_default(pos + vec3(1, 0, 0));
    auto y_neg = get_default(pos - vec3(0, 1, 0));
    auto y_pos = get_default(pos + vec3(0, 1, 0));
    auto z_neg = get_default(pos - vec3(0, 0, 1));
    auto z_pos = get_default(pos + vec3(0, 0, 1));
    auto d_max =
        std::max({x_neg.x, x_pos.x, y_neg.x, y_pos.x, z_neg.x, z_pos.x});

    // Determine the local irradiance value from the neighbors.
    auto old_val = sparse_writer.get(pos);
    auto new_val = [&] {
      auto id = terrain.get(pos);
      if (is_emissive(id)) {
        return Vec4<uint8_t>{
            kMaxIntensity, kMaxIntensity, kMaxIntensity, kMaxIntensity};
      } else if (is_occlusive(id)) {
        return Vec4<uint8_t>{};
      } else {
        auto val = static_cast<uint8_t>(std::max(0, d_max - 1));
        return Vec4{val, val, val, val};
      }
    }();

    // We update the current voxel's irradiance value based on its neighbors.
    if (old_val.x > new_val.x) {
      sparse_writer.set(pos, Vec4<uint8_t>{});
    } else if (old_val.x < new_val.x) {
      sparse_writer.set(pos, new_val);
    } else {
      continue;
    }

    // Recurse on each neighbor that _might_ require an update.
    push_if(
        x_neg.x < new_val.x - 1 || x_neg.x == old_val.x - 1,
        pos - vec3(1, 0, 0));
    push_if(
        x_pos.x < new_val.x - 1 || x_pos.x == old_val.x - 1,
        pos + vec3(1, 0, 0));
    push_if(
        y_neg.x < new_val.x - 1 || y_neg.x == old_val.x - 1,
        pos - vec3(0, 1, 0));
    push_if(
        y_pos.x < new_val.x - 1 || y_pos.x == old_val.x - 1,
        pos + vec3(0, 1, 0));
    push_if(
        z_neg.x < new_val.x - 1 || z_neg.x == old_val.x - 1,
        pos - vec3(0, 0, 1));
    push_if(
        z_pos.x < new_val.x - 1 || z_pos.x == old_val.x - 1,
        pos + vec3(0, 0, 1));
    if (old_val.x > new_val.x) {
      push_if(d_max > 1, pos);
    }
  }

  for (auto pos : sparse_writer.flush()) {
    signaler.signal(pos);
  }
}

void process_irradiance_rgb_queue(
    const TerrainMap& terrain,
    IrradianceMap& irradiance,
    IrradianceWriter& signaler,
    Queue<Vec3i>& queue) {
  // TODO(matthew): Evaluate if these colour calculations are correct (enough)
  ShardWriter<Vec4<uint8_t>> sparse_writer(irradiance);
  for (int color = 0; color < 3; ++color) {
    auto color_queue = queue;

    auto push_if = [&](bool condition, Vec3i pos) {
      if (condition) {
        color_queue.push(pos);
      }
    };

    auto get_default = [&](Vec3i pos) {
      return irradiance.contains(pos) ? sparse_writer.get(pos)[color] : 0;
    };

    while (!color_queue.empty()) {
      auto pos = color_queue.pop();
      if (!irradiance.contains(pos)) {
        continue;
      }

      // Fetch the neighbors occlusive values.
      auto x_neg = get_default(pos - vec3(1, 0, 0));
      auto x_pos = get_default(pos + vec3(1, 0, 0));
      auto y_neg = get_default(pos - vec3(0, 1, 0));
      auto y_pos = get_default(pos + vec3(0, 1, 0));
      auto z_neg = get_default(pos - vec3(0, 0, 1));
      auto z_pos = get_default(pos + vec3(0, 0, 1));
      auto d_max = std::max({x_neg, x_pos, y_neg, y_pos, z_neg, z_pos});

      // Determine the local irradiance value from the neighbors.
      auto new_val = [&] {
        auto id = terrain.get(pos);
        uint8_t dye = terrain.get_dye(pos);
        if (is_emissive(id) || is_occlusive(id)) {
          return emissiveness_old(id, dye)[color];
        } else {
          return static_cast<uint8_t>(std::max(0, d_max - 1));
        }
      }();

      // We update the current voxel's irradiance value based on its neighbors.
      auto old_val = sparse_writer.get(pos);
      if (old_val[color] > new_val) {
        auto val = old_val;
        val[color] = 0u;
        sparse_writer.set(pos, val);
      } else if (old_val[color] < new_val) {
        auto val = old_val;
        val[color] = new_val;
        sparse_writer.set(pos, val);
      } else {
        continue;
      }

      // Recurse on each neighbor that _might_ require an update.
      push_if(
          x_neg < new_val - 1 || x_neg == old_val[color] - 1,
          pos - vec3(1, 0, 0));
      push_if(
          x_pos < new_val - 1 || x_pos == old_val[color] - 1,
          pos + vec3(1, 0, 0));
      push_if(
          y_neg < new_val - 1 || y_neg == old_val[color] - 1,
          pos - vec3(0, 1, 0));
      push_if(
          y_pos < new_val - 1 || y_pos == old_val[color] - 1,
          pos + vec3(0, 1, 0));
      push_if(
          z_neg < new_val - 1 || z_neg == old_val[color] - 1,
          pos - vec3(0, 0, 1));
      push_if(
          z_pos < new_val - 1 || z_pos == old_val[color] - 1,
          pos + vec3(0, 0, 1));
      if (old_val[color] > new_val) {
        push_if(d_max > 1, pos);
      }
    }
  }

  for (auto pos : sparse_writer.flush()) {
    signaler.signal(pos);
  }
}

void SkyOcclusionWriter::update(Vec3i pos, tensors::Chunk<uint8_t> chunk) {
  map_->get().chunk(pos)->array = std::move(chunk.array);
  signal(pos);
}

void SkyOcclusionWriter::signal(Vec3i pos) {
  if (checksums_.update(pos, *map_->get().chunk(pos))) {
    stream_->write(pos);
  }
}

void IrradianceWriter::update(Vec3i pos, tensors::Chunk<Vec4<uint8_t>> chunk) {
  map_->get().chunk(pos)->array = std::move(chunk.array);
  signal(pos);
}

void IrradianceWriter::signal(Vec3i pos) {
  if (checksums_.update(pos, *map_->get().chunk(pos))) {
    stream_->write(pos);
  }
}

void LightSimulation::init() {
  const auto& terrain = terrain_->get();
  const auto [v0, v1] = terrain.aabb();
  const auto shape = to<unsigned int>(v1 - v0);

  // Initialize the sky-occlusion tensor.
  logger_->log("initializing sky-occlusion map with shape: ", shape);
  sky_occlusion_map_->set({
      {v0, v1},
      tensors::make_tensor<uint8_t>(shape, 0),
  });
  column_scanner_.set(Scanner2(tensors::chunk_div(shape).xz()));

  // Initialize the irradiance tensor.
  {
    logger_->log("initializing irradiance map with shape: ", shape);
    irradiance_map_->set({
        {v0, v1},
        tensors::make_tensor<Vec4<uint8_t>>(shape, Vec4<uint8_t>{0, 0, 0, 0}),
    });

    // Identify all locations with light sources.
    Queue<Vec3i> queue;
    tensors::find(terrain.seeds.tensor, &is_emissive, [&](auto pos, auto _) {
      queue.push(terrain.seeds.tensor_to_world(pos));
    });
    tensors::find(
        terrain.diffs.tensor,
        [](auto id) {
          return id && is_emissive(id.value());
        },
        [&](auto pos, auto _) {
          queue.push(terrain.diffs.tensor_to_world(pos));
        });

    // Flood-fill to populate the irradiance map from the light sources.
    process_irradiance_rgb_queue(
        terrain, irradiance_map_->get(), *irradiance_writer_, queue);
  }
}

void LightSimulation::tick() {
  auto changes = subscription_.read();

  const auto& terrain = terrain_->get();

  // Update all columns within the receptive-field of any changed terrain voxel.
  {
    Timer timer([&](double duration) {
      sky_occlusion_update_ms.Set(duration);
    });

    // Accumulate the distinct set of columns impacted by the changes.
    Set2 columns;
    for (auto pos : changes) {
      auto aabb = voxels::intersect_box(terrain.aabb(), sky_radius(pos));
      auto from = to_shard_pos(aabb.v0);
      for (auto z = from.z; z < aabb.v1.z; z += tensors::kChunkDim) {
        for (auto x = from.x; x < aabb.v1.x; x += tensors::kChunkDim) {
          columns.insert({x, z});
        }
      }
    }

    // Also schedule the next column in the scan.
    if (one_in(2)) {
      columns.insert(
          terrain.aabb().v0.xz() +
          to<int>(tensors::kChunkDim * column_scanner_.get().next()));
    }

    // Compute the new sky-occlusion tensor for the sheduled columns.
    auto& so_map = sky_occlusion_map_->get();
    auto& so_writer = *sky_occlusion_writer_;
    Queue<Vec3i> queue;
    for (auto column : columns) {
      initialize_sky_occlusion_column(column, terrain, so_writer);
      schedule_sky_occlusion_column(column, terrain, so_map, so_writer, queue);
    }
    process_sky_occlusion_queue(terrain, so_map, so_writer, queue);
  }

  // Update the irradiance map for all shards within some distance of a change.
  {
    Timer timer([&](double duration) {
      irradiance_update_ms.Set(duration);
    });

    auto queue = make_queue<Vec3i>(changes);
    auto& im = irradiance_map_->get();
    process_irradiance_rgb_queue(terrain, im, *irradiance_writer_, queue);
  }
}

inline float scaledGrowthIntensity(float maxIntensity, uint8_t growth) {
  float growthScale =
      growth == 0 ? 1.0 : (static_cast<float>(growth - 1)) / 4.0;
  return maxIntensity * growthScale;
}

Colour emissiveness(TerrainId id, uint8_t dye, uint8_t growth) {
  // TODO(matthew): Make this use terrain quirks after they has been
  // migrated to bikkie
  switch (id) {
    // led
    case 64:
      switch (dye) {
        // none
        case 0:
          return Colour{{255, 255, 255}, kMaxIntensity};

        // blue
        case 1:
          return Colour{{44, 116, 255}, kMaxIntensity};

        // red
        case 2:
          return Colour{{255, 80, 80}, kMaxIntensity};

        // green
        case 3:
          return Colour{{80, 255, 80}, kMaxIntensity};

        // orange
        case 4:
          return Colour{{255, 128, 32}, kMaxIntensity};

        // white
        case 5:
          return Colour{{255, 255, 255}, kMaxIntensity};

        // purple
        case 6:
          return Colour{{128, 80, 255}, kMaxIntensity};

        // pink
        case 7:
          return Colour{{255, 96, 207}, kMaxIntensity};

        // yellow
        case 8:
          return Colour{{255, 232, 23}, kMaxIntensity};

        // black
        case 9:
          return Colour{{160, 16, 255}, kMaxIntensity};

        // tan
        case 10:
          return Colour{{255, 209, 143}, kMaxIntensity};

        // brown
        case 11:
          return Colour{{121, 55, 14}, kMaxIntensity};

        // silver
        case 12:
          return Colour{{127, 136, 151}, kMaxIntensity};

        // cyan
        case 13:
          return Colour{{21, 255, 245}, kMaxIntensity};

        // magenta
        case 14:
          return Colour{{252, 15, 255}, kMaxIntensity};

        // brightgreen
        case 15:
          return Colour{{189, 255, 177}, kMaxIntensity};

        // brightred
        case 16:
          return Colour{{255, 157, 157}, kMaxIntensity};

        // brightpurple
        case 17:
          return Colour{{223, 187, 255}, kMaxIntensity};

        // brightpink
        case 18:
          return Colour{{255, 220, 236}, kMaxIntensity};

        // brightyellow
        case 19:
          return Colour{{255, 254, 217}, kMaxIntensity};

        // brightblue
        case 20:
          return Colour{{150, 183, 255}, kMaxIntensity};

        // brightorange
        case 21:
          return Colour{{255, 197, 142}, kMaxIntensity};

        // lightblue
        case 22:
          return Colour{{176, 228, 255}, kMaxIntensity};
      };

    // emberstone
    case 65:
      return Colour{{255, 96, 80}, kMaxIntensity};

    // sunstone
    case 66:
      return Colour{{255, 192, 48}, kMaxIntensity};

    // moonstone
    case 67:
      return Colour{{240, 240, 255}, kMaxIntensity};

    // flare
    case 16777231:
      return Colour{{255, 255, 255}, kMaxIntensity};

    // ultraviolet
    case 16777261:
      return Colour{
          {153, 50, 204}, scaledGrowthIntensity(kMaxIntensity, growth)};

    // Fire Flower
    case 16777263:
      return Colour{{255, 0, 40}, scaledGrowthIntensity(kMaxIntensity, growth)};

    // Marigold
    case 16777264:
      return Colour{
          {255, 165, 0}, scaledGrowthIntensity(kMaxIntensity, growth)};

    // Morning Glory
    case 16777265:
      return Colour{
          {130, 200, 255}, scaledGrowthIntensity(kMaxIntensity, growth)};

    // Peony
    case 16777266:
      return Colour{
          {255, 90, 170}, scaledGrowthIntensity(kMaxIntensity, growth)};

    // Sun Flower
    case 16777267:
      return Colour{
          {255, 255, 0}, scaledGrowthIntensity(kMaxIntensity, growth)};

    default:
      return Colour{{255, 255, 255}, 0};
  };
}

inline Colour get_colour(const std::array<Colour, 6>& colours) {
  Vec3f rgb{0.0, 0.0, 0.0};
  float mx = 0;
  float total = 0;
  for (const Colour& colour : colours) {
    rgb += colour.rgb * colour.intensity;
    mx = std::max(mx, colour.intensity);
    total += colour.intensity;
  }
  rgb = total != 0.0 ? rgb / total : Vec3f{};
  float intensity = mx != 0 ? mx - 1 : 0;
  return Colour{rgb, intensity};
}

tensors::Tensor<uint32_t> update_irradiance(
    const VolumeChunk& terrain,
    const DyeChunk& dye,
    const GrowthChunk& growth,
    const tensors::Tensor<uint32_t>& sources_tensor) {
  CHECK_ARGUMENT(
      all_equal(Vec3u{96, 96, 96}, terrain.shape, dye.shape, growth.shape));
  CHECK_ARGUMENT(all_equal(Vec3u{64, 64, 64}, sources_tensor.shape));

  // The emscripten stack size is 64kb so these can't be on it.
  // TODO(tg): Benchmark heap allocation here to see if it makes any difference.
  static std::array<Colour, 64 * 64 * 64> out{};
  static std::bitset<64 * 64 * 64> occlusive{};
  static std::bitset<64 * 64 * 64> update1{};
  static std::bitset<64 * 64 * 64> update2{};
  update1.reset();
  update2.reset();

  auto to_index = [](Vec3i pos) {
    return pos.x + 64 * (pos.y + 64 * pos.z);
  };

  const auto x_stride = 1;
  const auto y_stride = 64;
  const auto z_stride = 64 * 64;

  auto set_neighbors = [&](auto& update, int i) {
    update[i + x_stride] = !occlusive[i + x_stride];
    update[i - x_stride] = !occlusive[i - x_stride];
    update[i + y_stride] = !occlusive[i + y_stride];
    update[i - y_stride] = !occlusive[i - y_stride];
    update[i + z_stride] = !occlusive[i + z_stride];
    update[i - z_stride] = !occlusive[i - z_stride];
  };

  // Initialize the occlusive mask.
  tensors::scan_dense(terrain, [&](Vec3u pos, TerrainId id) {
    const auto ipos = to<int>(pos) - vec3(16, 16, 16);
    if (voxels::box_contains({{0, 0, 0}, {64, 64, 64}}, ipos)) {
      occlusive[to_index(ipos)] = is_occlusive(id);
    }
  });

  // Do the first past by writing light sources and initializing the frontier.
  tensors::scan_dense(terrain, [&](Vec3u pos, TerrainId id) {
    const auto ipos = to<int>(pos) - vec3(16, 16, 16);
    if (voxels::box_contains({{0, 0, 0}, {64, 64, 64}}, ipos)) {
      const auto index = to_index(ipos);
      const auto color = emissiveness(id, dye.get(pos), growth.get(pos));
      out[index] = color;
      if (voxels::box_contains({{1, 1, 1}, {63, 63, 63}}, ipos)) {
        if (color.intensity > 0.0f) {
          set_neighbors(update1, index);
        }
      }
    }
  });

  // Merge in non-terrain light sources.
  tensors::scan_sparse(sources_tensor, [&](Vec3u pos, uint32_t rgba) {
    const auto ipos = to<int>(pos);
    if (voxels::box_contains({{0, 0, 0}, {64, 64, 64}}, ipos)) {
      const auto index = to_index(ipos);
      const auto color = Colour::unpack(rgba);
      out[index] = color;
      if (voxels::box_contains({{1, 1, 1}, {63, 63, 63}}, ipos)) {
        if (color.intensity > 0.0f) {
          set_neighbors(update1, index);
        }
      }
    }
  });

  // Convolve
  for (size_t j = 0; j < kMaxIntensity - 1; ++j) {
    auto i = -1;
    auto& curr = j % 2 == 0 ? update1 : update2;
    auto& next = j % 2 == 0 ? update2 : update1;
    for (int z = 0; z < 64; ++z) {
      for (int y = 0; y < 64; ++y) {
        for (int x = 0; x < 64; ++x) {
          ++i;
          if (x < 1 || y < 1 || z < 1 || x >= 63 || y >= 63 || z >= 63) {
            continue;
          }
          if (!curr[i]) {
            continue;
          }
          const auto self = out[i];
          const auto val = get_colour({
              out[i - x_stride],
              out[i + x_stride],
              out[i - y_stride],
              out[i + y_stride],
              out[i - z_stride],
              out[i + z_stride],
          });
          out[i] = val;
          if (val.intensity > self.intensity) {
            set_neighbors(next, i);
          }
        }
      }
    }
    curr.reset();
  }

  return tensors::map_dense(
      tensors::make_tensor<uint32_t>({32, 32, 32}),
      [&](auto pos, ATTR_UNUSED auto _) {
        return out[to_index(to<int>(pos) + vec3(16, 16, 16))].pack();
      });
}

WorldMap<uint32_t> update_irradiance(
    const TerrainMapV2& map,
    Vec3i pos,
    const tensors::Tensor<uint32_t>& sources_tensor) {
  CHECK_ARGUMENT(is_shard_aligned(pos));
  auto aabb = voxels::shift_box(voxels::cube_box(96), pos - vec3(32, 32, 32));
  auto irradiance = update_irradiance(
      sub_world_map(map.terrains, aabb).tensor,
      sub_world_map(map.dyes, aabb).tensor,
      sub_world_map(map.growths, aabb).tensor,
      sources_tensor);
  CHECK_STATE(irradiance.shape == kShardShape);
  return WorldMap<uint32_t>{{pos, pos + to<int>(kShardShape)}, irradiance};
}

bool is_empty(const TerrainMapV2& map, Vec3i pos) {
  return !tensors::any(map.terrains.chunk(pos)->array, [](TerrainId id) {
    return is_occlusive(id);
  });
}

void initialize_sky_occlusion_column(
    const TerrainMapV2& map, WorldMap<uint8_t>& occlusions, Vec2i column) {
  auto [sx, sz] = column;
  auto [v0, v1] = occlusions.aabb;

  auto step = static_cast<int>(tensors::kChunkDim);
  auto sy = v1.y - step;

  // Emit all of the empty non-occlusive shards.
  for (; is_empty(map, {sx, sy, sz}); sy -= step) {
    occlusions.chunk({sx, sy, sz}) = tensors::make_chunk_ptr<uint8_t>(0);
  }

  static const auto layer_size = tensors::kChunkDim * tensors::kChunkDim;

  // Emit shards until every voxel column is occluded.
  std::bitset<layer_size> prev;
  for (; !prev.all() && sy >= v0.y; sy -= step) {
    auto src = reverse(map.terrains.chunk({sx, sy, sz})->array);
    auto dst = tensors::map_dense(src, [&](auto pos, TerrainId id) {
      auto i = pos % layer_size;
      if (is_occlusive(id)) {
        prev[i] = true;
      }
      return static_cast<uint8_t>(prev[i] ? kMaxOcclusion : 0);
    });
    occlusions.chunk({sx, sy, sz}) =
        tensors::make_chunk_ptr(tensors::Chunk(reverse(dst)));
  }

  // Emit the final shards that are fully occluded.
  for (; sy >= v0.y; sy -= step) {
    occlusions.chunk({sx, sy, sz}) =
        tensors::make_chunk_ptr<uint8_t>(kMaxOcclusion);
  }
}

Queue<Vec3i> schedule_sky_occlusion_column(
    Vec2i column, const TerrainMapV2& map, WorldMap<uint8_t>& occlusion_map) {
  auto [sx, sz] = column;
  auto [v0, v1] = map.aabb();

  auto step = static_cast<int>(tensors::kChunkDim);
  auto sy = v1.y - step;

  // Skip over all fully non-occlusive shards.
  for (; is_empty(map, {sx, sy, sz}); sy -= step) {
  }

  auto get_default = [&](Vec3i pos) {
    return occlusion_map.maybe_get(pos).value_or(
        map.occlusions.maybe_get(pos).value_or(kMaxOcclusion));
  };

  Queue<Vec3i> queue;
  // Identify all occlusive voxels with at least one non-occlusive neighbor.
  for (; sy >= v0.y; sy -= step) {
    auto origin = vec3(sx, sy, sz);
    tensors::scan(occlusion_map.chunk(origin)->array, [&](auto run, auto so) {
      if (so != kMaxOcclusion) {
        return;
      }
      for (auto i = run.pos; i < run.pos + run.len; i += 1) {
        auto pos = origin + to<int>(tensors::decode_tensor_pos(i));
        if (i == run.pos) {
          if (get_default(pos - vec3(1, 0, 0)) < kMaxOcclusion - 1) {
            queue.push(pos);
            continue;
          }
        }
        if (i == run.pos + run.len - 1) {
          if (get_default(pos + vec3(1, 0, 0)) < kMaxOcclusion - 1) {
            queue.push(pos);
            continue;
          }
        }
        auto z_neg = get_default(pos - vec3(0, 0, 1)) < kMaxOcclusion - 1;
        auto z_pos = get_default(pos + vec3(0, 0, 1)) < kMaxOcclusion - 1;
        if (z_neg || z_pos) {
          queue.push(pos);
        }
      }
    });
  }

  return queue;
}

void process_sky_occlusion_queue(
    const TerrainMapV2& map,
    WorldMap<uint8_t>& occlusions,
    Queue<Vec3i>& queue) {
  auto push_if = [&](bool condition, Vec3i pos) {
    if (condition) {
      queue.push(pos);
    }
  };

  ShardWriter<uint8_t> sparse_writer(occlusions);

  auto get_default = [&](Vec3i pos) {
    return occlusions.contains(pos) ? sparse_writer.get(pos) : kMaxOcclusion;
  };

  while (!queue.empty()) {
    auto pos = queue.pop();
    if (!occlusions.contains(pos)) {
      continue;
    }
    if (is_occlusive(map.terrains.get(pos))) {
      continue;
    }

    // Fetch the neighbors occlusive values.
    auto x_neg = get_default(pos - vec3(1, 0, 0));
    auto x_pos = get_default(pos + vec3(1, 0, 0));
    auto y_neg = get_default(pos - vec3(0, 1, 0));
    auto y_pos = get_default(pos + vec3(0, 1, 0));
    auto z_neg = get_default(pos - vec3(0, 0, 1));
    auto z_pos = get_default(pos + vec3(0, 0, 1));
    auto d_min = std::min({x_neg, x_pos, y_neg, y_pos, z_neg, z_pos});

    // Determine the local occlusive value from the neighbors.
    auto old_val = sparse_writer.get(pos);
    auto new_val = std::min<uint8_t>(kMaxOcclusion, d_min + kOcclusionStep);

    // We update the current voxel's irradiance value based on its
    // neighbors.
    if (old_val > new_val) {
      sparse_writer.set(pos, new_val);
    } else {
      continue;
    }

    // Recurse on each neighbor that _might_ require an update.
    push_if(x_neg > new_val + kOcclusionStep, pos - vec3(1, 0, 0));
    push_if(x_pos > new_val + kOcclusionStep, pos + vec3(1, 0, 0));
    push_if(y_neg > new_val + kOcclusionStep, pos - vec3(0, 1, 0));
    push_if(y_pos > new_val + kOcclusionStep, pos + vec3(0, 1, 0));
    push_if(z_neg > new_val + kOcclusionStep, pos - vec3(0, 0, 1));
    push_if(z_pos > new_val + kOcclusionStep, pos + vec3(0, 0, 1));
  }

  sparse_writer.flush();
}

voxels::Box expand_aabb(
    const voxels::Box& aabb, Vec3i padding_neg, Vec3i padding_pos) {
  return {
      aabb.v0 - static_cast<int>(tensors::kChunkDim) * padding_neg,
      aabb.v1 + static_cast<int>(tensors::kChunkDim) * padding_pos};
}

WorldMap<uint8_t> update_occlusion(const TerrainMapV2& map, Vec2i column) {
  voxels::Box column_aabb{
      {column.x, map.aabb().v0.y, column.y},
      {column.x + static_cast<int>(tensors::kChunkDim),
       map.aabb().v1.y,
       column.y + static_cast<int>(tensors::kChunkDim)},
  };

  auto aabb = voxels::intersect_box(
      map.aabb(), expand_aabb(column_aabb, {1, 0, 1}, {1, 0, 1}));

  auto relevant_occlusions = sub_world_map(map.occlusions, aabb);
  initialize_sky_occlusion_column(map, relevant_occlusions, column);
  auto queue = schedule_sky_occlusion_column(column, map, relevant_occlusions);
  process_sky_occlusion_queue(map, relevant_occlusions, queue);

  return sub_world_map(relevant_occlusions, column_aabb);
}

}  // namespace voxeloo::gaia
