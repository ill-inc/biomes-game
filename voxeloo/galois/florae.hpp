#pragma once

#include <algorithm>
#include <cereal/types/array.hpp>
#include <cereal/types/common.hpp>
#include <cereal/types/tuple.hpp>
#include <cereal/types/vector.hpp>
#include <map>
#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/hashing.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/transport.hpp"
#include "voxeloo/galois/collision.hpp"
#include "voxeloo/galois/material_properties.hpp"
#include "voxeloo/galois/muck.hpp"
#include "voxeloo/galois/utils.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/sparse.hpp"

namespace voxeloo::galois::florae {

enum class GrowthLevel { None, Seed, Sprout, Flowering, Adult, Wilted, Size };

static const std::unordered_map<std::string, GrowthLevel> kGrowthMap{
    {"none", GrowthLevel::None},
    {"seed", GrowthLevel::Seed},
    {"sprout", GrowthLevel::Sprout},
    {"flowering", GrowthLevel::Flowering},
    {"adult", GrowthLevel::Adult},
    {"wilted", GrowthLevel::Wilted}};

using FloraId = std::uint32_t;
using SampleId = std::uint32_t;
using Tensor = tensors::Tensor<FloraId>;
using Growth = uint8_t;
using GrowthTensor = tensors::Tensor<Growth>;

enum class MuckLevel { None, Muck, Size };
static const std::unordered_map<std::string, MuckLevel> kMuckMap{
    {"none", MuckLevel::None}, {"muck", MuckLevel::Muck}};

static constexpr uint32_t kMaxSamplesPerCriteria = 10;
static constexpr uint32_t kQuadStride = 9;

struct QuadVertex {
  Vec3f pos;
  Vec3f normal;
  Vec2f uv;
  float texture;
  uint32_t index;
};

struct Quads {
  std::vector<QuadVertex> vertices;
  std::vector<uint32_t> indices;
};

template <typename Archive>
inline auto save(Archive& ar, const Quads& quads) {
  ar(quads.vertices);
  ar(quads.indices);
}

template <typename Archive>
inline auto load(Archive& ar, Quads& quads) {
  ar(quads.vertices);
  ar(quads.indices);
}

struct Samples {
  uint32_t count;
  std::array<SampleId, kMaxSamplesPerCriteria> ids;

  bool operator==(const Samples&) const = default;
};

template <typename Archive>
inline auto save(Archive& ar, const Samples& samples) {
  ar(samples.count);
  ar(samples.ids);
}

template <typename Archive>
inline auto load(Archive& ar, Samples& samples) {
  ar(samples.count);
  ar(samples.ids);
}

inline uint16_t encode_criteria(
    FloraId id, GrowthLevel growth, MuckLevel muck) {
  // TODO(matthew): We currently can't go beyond kMaxDictKey, update the
  // succint stuff to be more general.
  uint16_t val =
      (static_cast<uint16_t>(id) << 8) | pack_enums<uint8_t>(growth, muck);
  CHECK_ARGUMENT(val < tensors::kMaxDictKey);
  return val;
}

enum class RotationType : uint32_t {
  None,
  YawOnly,
  Any,
};
static const std::unordered_map<std::string, RotationType> kRotationMap{
    {"none", RotationType::None},
    {"yaw", RotationType::YawOnly},
    {"any", RotationType::Any}};

enum class WindType : uint32_t {
  None,
  Plant,
  Leaf,
};
static const std::unordered_map<std::string, WindType> kWindMap{
    {"none", WindType::None},
    {"plant", WindType::Plant},
    {"leaf", WindType::Leaf}};

// Must match terrain.glsl
struct FloraAnimation {
  RotationType rotation;
  WindType wind;
};

// Was having issues with cereal automatic serialization of FloraProperties so
// do this
template <typename Archive>
inline auto save(Archive& ar, const FloraAnimation& properties) {
  ar(properties.rotation);
  ar(properties.wind);
}

template <typename Archive>
inline auto load(Archive& ar, FloraAnimation& properties) {
  ar(properties.rotation);
  ar(properties.wind);
}

struct Index {
  tensors::Array<Samples> samples;
  std::vector<Quads> quads;
  FloraId fallback;
  std::vector<FloraAnimation> flora_animations;

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(*this));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(*this, transport::from_base64(blob));
  }
};

class IndexBuilder {
 public:
  // GrowthLevel, MuckLevel
  using Criteria = std::tuple<std::string, std::string>;

  void set_fallback(FloraId fallback) {
    fallback_ = fallback;
  }

  auto& add_samples(
      FloraId id, std::vector<std::pair<SampleId, Criteria>> samples) {
    // Add the list of samples
    for (auto [sample_id, criteria] : samples) {
      const auto& [growth_str, muck_str] = criteria;
      auto growth_level = kGrowthMap.at(growth_str);

      // It will be common for plants to have the same sample inside and outside
      // muck.
      auto muck_levels =
          muck_str == "any"
              ? std::vector<MuckLevel>{MuckLevel::None, MuckLevel::Muck}
              : std::vector<MuckLevel>{kMuckMap.at(muck_str)};

      for (auto muck_level : muck_levels) {
        auto& samples = samples_[encode_criteria(id, growth_level, muck_level)];
        CHECK_ARGUMENT(samples.count < samples.ids.max_size());
        samples.ids[samples.count++] = sample_id;
      }
    }

    return *this;
  }

  auto& set_animation(FloraId id, std::string rotation, std::string wind) {
    if (id >= flora_animations_.size()) {
      flora_animations_.resize(id + 1);
    }
    flora_animations_[id] = {kRotationMap.at(rotation), kWindMap.at(wind)};
    return *this;
  }

  auto& add_quads(SampleId id, Quads quads) {
    quads_.push_back({id, std::move(quads)});
    return *this;
  }

  auto build() {
    CHECK_ARGUMENT(samples_.size() > 0);
    CHECK_ARGUMENT(quads_.size() > 0);

    tensors::SparseArrayBuilder<Samples> builder(tensors::kMaxDictKey);

    for (const auto& [criteria, samples] : samples_) {
      builder.add(criteria, samples);
    }

    Index ret{
        std::move(builder).build(),
        {},
        fallback_,
        std::move(flora_animations_)};

    // Sort and push back the sample index.
    sort_by(quads_, [](auto& tuple) {
      return std::get<0>(tuple);
    });
    ret.quads.resize(std::get<0>(quads_.back()) + 1);
    for (const auto& [id, quads] : quads_) {
      ret.quads[id] = quads;
    }

    return ret;
  }

 private:
  std::map<uint16_t, Samples> samples_;
  std::vector<std::tuple<SampleId, Quads>> quads_;
  std::vector<FloraAnimation> flora_animations_;
  FloraId fallback_;
};

struct GeometryBuffer {
  Vec3i origin;
  std::vector<QuadVertex> vertices;
  std::vector<uint32_t> indices;

  auto vertices_view() const {
    return reinterpret_cast<const uint8_t*>(&vertices[0]);
  }

  auto indices_view() const {
    return reinterpret_cast<const uint8_t*>(&indices[0]);
  }

  auto vertices_bytes() const {
    return sizeof(QuadVertex) * vertices.size();
  }

  auto indices_bytes() const {
    return sizeof(uint32_t) * indices.size();
  }

  auto stride() const {
    return sizeof(QuadVertex) / sizeof(float);
  }
};

template <typename Archive>
inline auto save(Archive& ar, const QuadVertex& vertex) {
  ar(vertex.pos.x, vertex.pos.y, vertex.pos.z);
  ar(vertex.normal.x, vertex.normal.y, vertex.normal.z);
  ar(vertex.uv.x, vertex.uv.y);
  ar(vertex.texture);
  ar(vertex.index);
}

template <typename Archive>
inline auto load(Archive& ar, QuadVertex& vertex) {
  ar(vertex.pos.x, vertex.pos.y, vertex.pos.z);
  ar(vertex.normal.x, vertex.normal.y, vertex.normal.z);
  ar(vertex.uv.x, vertex.uv.y);
  ar(vertex.texture);
  ar(vertex.index);
}

template <typename Archive>
inline auto save(Archive& ar, const Index& index) {
  ar(index.samples);
  ar(index.quads);
  ar(index.fallback);
  ar(index.flora_animations);
}

template <typename Archive>
inline auto load(Archive& ar, Index& index) {
  ar(index.samples);
  ar(index.quads);
  ar(index.fallback);
  ar(index.flora_animations);
}

inline GrowthLevel growth_to_level(Growth growth) {
  return static_cast<GrowthLevel>(std::clamp<uint32_t>(
      growth & 0xf, 0u, static_cast<Growth>(GrowthLevel::Size) - 1u));
}

inline MuckLevel muck_to_level(muck::Muck muck, Vec3i pos) {
  if (muck == 0) {
    return MuckLevel::None;
  } else if (muck == 1) {
    auto below = (32 + ((pos - vec3(0, 1, 0)) % 32)) % 32;
    return position_hash(below) % 3 == 0 ? MuckLevel::None : MuckLevel::Muck;
  } else {
    return MuckLevel::Muck;
  }
}

inline auto sample_flora(
    const Index& index, FloraId id, Growth growth, muck::Muck muck, Vec3i pos) {
  auto growth_level = growth_to_level(growth);
  auto muck_level = muck_to_level(muck, pos);
  uint16_t tag = encode_criteria(id, growth_level, muck_level);
  const auto& desired_samples = index.samples.get(tag);
  const auto& samples =
      desired_samples.count > 0
          ? desired_samples
          : index.samples.get(encode_criteria(
                index.fallback, GrowthLevel::None, MuckLevel::None));
  return samples.ids.at(position_hash(pos) % samples.count);
}

inline auto to_geometry(
    const Tensor& tensor,
    const GrowthTensor& growth,
    const muck::Tensor& muck,
    const Index& index,
    Vec3i origin) {
  GeometryBuffer ret{origin};

  auto tensor_offset = 0u;
  tensors::scan_sparse(tensor, [&](auto pos, auto id) {
    auto global = to<int>(pos) + origin;
    auto sample =
        sample_flora(index, id, growth.get(pos), muck.get(pos), global);
    auto& quads = index.quads.at(sample);

    // Pack the sparse and dense tensor indices into the vertex.
    uint32_t index = tensors::encode_tensor_pos(pos) & 0xffff;
    index |= tensor_offset << 16;
    tensor_offset += 1;

    // Shift the quads to the appropriate location.
    uint32_t v_start = static_cast<uint32_t>(ret.vertices.size());
    extend(ret.vertices, quads.vertices);
    for (auto i = v_start; i < ret.vertices.size(); i += 1) {
      ret.vertices[i].pos += to<float>(pos);
      ret.vertices[i].index = index;
    }

    // Shift the indices to the appropriate offet.
    uint32_t i_start = static_cast<uint32_t>(ret.indices.size());
    extend(ret.indices, quads.indices);
    for (auto i = i_start; i < ret.indices.size(); i += 1) {
      ret.indices[i] += v_start;
    }
  });

  return ret;
}

inline auto to_geometry(
    const Tensor& tensor,
    const GrowthTensor& growth,
    const muck::Tensor& muck,
    const Index& index) {
  return to_geometry(tensor, growth, muck, index, {0, 0, 0});
}

inline auto to_box_list(
    const Index& index, const Tensor& tensor, Vec3d origin) {
  // TODO(taylor): Work out the collidable bit from a flora index.
  static auto colliding_flora = [] {
    std::array<bool, 256> ret;
    ret[1] = true;   // oak_leaf
    ret[2] = true;   // birch_leaf
    ret[3] = true;   // rubber_leaf
    ret[19] = true;  // bamboo_bush
    ret[20] = true;  // ivy_vine
    ret[21] = true;  // boxwood_shrub
    ret[24] = true;  // mucky_brambles
    ret[27] = true;  // sakura_leaf
    ret[40] = true;  // eye_plant
    ret[41] = true;  // spiky_plant
    ret[54] = true;  // cactus
    return ret;
  }();

  return collision::to_box_list(
      tensors::map_values(
          tensor,
          [](auto id) {
            return colliding_flora[id];
          }),
      origin);
}

inline uint32_t pack_properties(
    const florae::Growth& growth,
    const muck::Muck& muck,
    FloraAnimation properties,
    auto pos) {
  // Growth bits defined in src/shared/asset_defs/growth.ts
  // Packing must match terrain.glsl
  bool is_wilting = (growth & 0x10) != 0;
  uint32_t packed = 0;
  packed |= is_wilting << 0;
  packed |= muck << 1;
  packed |= static_cast<uint32_t>(properties.rotation) << 9;
  packed |= static_cast<uint32_t>(properties.wind) << 11;
  return packed;
}

inline material_properties::Buffer to_material_buffer(
    const Tensor& tensor,
    const florae::GrowthTensor& growth,
    const muck::Tensor& muck,
    const Index& index) {
  return material_properties::to_buffer(
      tensors::map_sparse(tensor, [&](auto pos, auto val) {
        return std::optional{pack_properties(
            growth.get(pos),
            muck.get(pos),
            index.flora_animations.at(val),
            pos)};
      }));
}

}  // namespace voxeloo::galois::florae
