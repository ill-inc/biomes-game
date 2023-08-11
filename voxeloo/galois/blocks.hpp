#pragma once

#include <algorithm>
#include <cereal/types/array.hpp>
#include <cereal/types/vector.hpp>
#include <map>
#include <numeric>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/hashing.hpp"
#include "voxeloo/common/utils.hpp"
#include "voxeloo/galois/florae.hpp"
#include "voxeloo/galois/material_properties.hpp"
#include "voxeloo/galois/muck.hpp"
#include "voxeloo/galois/sbo.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/sparse.hpp"

namespace voxeloo::galois::blocks {

enum class CheckboardPosition : uint8_t { White, Black, Size };
enum class MoistureLevel : uint8_t { Zero, Low, Moderate, High, Full, Size };
enum class MuckLevel : uint8_t { None, Muck, Size };

// TODO(matthew): Move these conversions to happen on the Python side.
static const std::unordered_map<std::string, CheckboardPosition> kCheckboardMap{
    {"white", CheckboardPosition::White}, {"black", CheckboardPosition::Black}};

static const std::unordered_map<std::string, MoistureLevel> kMoistureMap{
    {"zero", MoistureLevel::Zero},
    {"low", MoistureLevel::Low},
    {"moderate", MoistureLevel::Moderate},
    {"high", MoistureLevel::High},
    {"full", MoistureLevel::Full}};

static const std::unordered_map<std::string, MuckLevel> kMuckMap{
    {"none", MuckLevel::None}, {"muck", MuckLevel::Muck}};

using Dye = uint8_t;
using Moisture = uint8_t;
using DyeTensor = tensors::Tensor<Dye>;
using MoistureTensor = tensors::Tensor<Moisture>;
using BlockSampleCriteria =
    std::tuple<CheckboardPosition, Dye, MuckLevel, MoistureLevel>;

inline uint16_t encode_criteria(
    CheckboardPosition position,
    Dye dye,
    MuckLevel muck,
    MoistureLevel moisture) {
  // TODO(matthew): We currently can't go beyond kMaxDictKey, update the
  // succint stuff to be more general.
  uint16_t value = static_cast<uint16_t>(dye) << 8 |
                   pack_enums<uint8_t>(position, muck, moisture);
  CHECK_ARGUMENT(value < tensors::kMaxDictKey);
  return value;
}

using BlockId = uint32_t;
using BlockData = std::tuple<uint32_t, uint32_t>;
static_assert(sizeof(BlockData) == 8);
using Tensor = tensors::Tensor<BlockId>;
using OcclusionTensor = tensors::Tensor<uint8_t>;

static constexpr uint32_t kSamplesPerVariant = 8;
struct Samples {
  uint32_t count;
  std::array<uint32_t, kSamplesPerVariant> offsets;

  bool operator==(const Samples&) const = default;
};

template <typename Archive>
inline auto save(Archive& ar, const Samples& samples) {
  ar(samples.count);
  ar(samples.offsets);
}

template <typename Archive>
inline auto load(Archive& ar, Samples& samples) {
  ar(samples.count);
  ar(samples.offsets);
}

using Sampler = tensors::Array<Samples>;

struct Index {
  uint32_t error;
  std::vector<Sampler> samplers;

  const Sampler& get_error_sampler() const {
    return samplers[error];
  }

  const Sampler& get_sampler(uint32_t id) const {
    return id < samplers.size() ? samplers[id] : get_error_sampler();
  }

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(*this));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(*this, transport::from_base64(blob));
  }
};

template <typename Archive>
inline auto save(Archive& ar, const Index& index) {
  ar(index.error);
  ar(index.samplers);
}

template <typename Archive>
inline auto load(Archive& ar, Index& index) {
  ar(index.error);
  ar(index.samplers);
}

class IndexBuilder {
 public:
  using Criteria = std::tuple<std::string, uint8_t, std::string, std::string>;

  explicit IndexBuilder(uint32_t max_block_id, uint32_t error) {
    index_.samplers.resize(max_block_id + 1);
    index_.error = error;
  }

  void add_block(
      uint32_t block_id,
      const std::vector<std::pair<Criteria, uint32_t>>& samples) {
    CHECK_ARGUMENT(block_id < index_.samplers.size());
    CHECK_ARGUMENT(samples.size() > 0);

    // Bucket the samples into their proper `Samples` based off of their
    // criteria tag.
    std::map<uint16_t, Samples> variant_map;
    for (const auto& [criteria, index] : samples) {
      const auto& [checkboard_str, dye, muck_str, moisture_str] = criteria;
      auto checkboard = kCheckboardMap.at(checkboard_str.c_str());

      // It will be common for plants to have the same sample inside and outside
      // muck.
      auto muck_range =
          muck_str == "any"
              ? std::pair{MuckLevel::None, MuckLevel::Muck}
              : std::pair{kMuckMap.at(muck_str), kMuckMap.at(muck_str)};

      // Moisture is a special case in that blocks can have a non-zero moisture
      // value but not display a special texture. We can efficiently set a range
      // of moistures to have the same samples due to RLE.
      auto moisture_range =
          moisture_str == "any"
              ? std::pair{MoistureLevel::Zero, MoistureLevel::Full}
              : std::pair{
                    kMoistureMap.at(moisture_str),
                    kMoistureMap.at(moisture_str)};

      for (auto muck = muck_range.first; muck <= muck_range.second;
           muck = next(muck)) {
        for (auto moisture = moisture_range.first;
             moisture <= moisture_range.second;
             moisture = next(moisture)) {
          uint16_t encoded = encode_criteria(checkboard, dye, muck, moisture);
          auto& variant = variant_map[encoded];
          CHECK_ARGUMENT(variant.count < variant.offsets.max_size());
          variant.offsets[variant.count++] = index;
        }
      }
    }

    tensors::SparseArrayBuilder<Samples> builder{tensors::kMaxDictKey};
    for (const auto& [criteria, samples] : variant_map) {
      builder.add(criteria, samples);
    }

    // Build the sampler
    index_.samplers.insert(
        index_.samplers.begin() + block_id, std::move(builder).build());
  }

  auto build() {
    CHECK_ARGUMENT(index_.get_error_sampler().get(0).count > 0);
    return index_;
  }

 private:
  Index index_;
};

inline auto to_surface_tensor(
    const Tensor& tensor, const OcclusionTensor& occlusion) {
  return tensors::map_sparse(tensor, [&](auto pos, auto val) {
    if (occlusion.get(pos) != 0b111111) {
      return val;
    }
    return static_cast<BlockId>(0);
  });
}

inline uint32_t sample_offset(const Samples& samples, Vec3i pos) {
  CHECK_ARGUMENT(samples.count > 0);
  return samples.offsets.at(position_hash(pos) % samples.count);
}

// It is reasonable for an texture offset to be zero. However, that makes it
// impossible to sparsely scan a tensor of these offsets correctly. This pair of
// functions is needed to work around this limitation.
// TODO(matthew): It would be better if an explicit conversion was required
// to/from the encoding. However, this would mess with the python tensor
// interface.
static constexpr uint32_t encode_offset(uint32_t offset) {
  CHECK_ARGUMENT(offset < std::numeric_limits<uint32_t>::max());
  return offset + 1;
}
constexpr uint32_t decode_offset(uint32_t encoded_offset) {
  CHECK_ARGUMENT(encoded_offset > 0);
  return encoded_offset - 1;
}

using BlockSampleTensor = tensors::Tensor<uint32_t>;

// This function tries to get the `Samples` for the given block and tag.
// If that doesn't exist, it falls back to providing the fallback error samples.
inline const Samples& get_samples(
    const Index& index, BlockId block, uint16_t tag) {
  const auto& sample = index.get_sampler(block).get(tag);
  return sample.count > 0 ? sample : index.get_error_sampler().get(0u);
}

inline MuckLevel muck_to_level(muck::Muck muck, Vec3i pos) {
  if (muck == 0) {
    return MuckLevel::None;
  } else if (muck == 1) {
    return position_hash(pos) % 3 == 0 ? MuckLevel::None : MuckLevel::Muck;
  } else {
    return MuckLevel::Muck;
  }
}

// This function picks textures for each block randomly based off the block,
// moisture and dye tensors. The BlockSampleTensor consists of LUT indices of
// the texture of each block.
inline auto to_block_sample_tensor(
    const Tensor& blocks,
    const DyeTensor& dyes,
    const muck::Tensor& muck,
    const MoistureTensor& moistures,
    const Index& index) {
  return tensors::map_sparse(blocks, [&](auto pos, auto block_id) {
    auto checkboard =
        static_cast<CheckboardPosition>((pos.x + pos.y + pos.z) & 0x1);
    // Quantize Moistures into 5 groups:
    // 0, [1, 25], [26, 50], [51, 75], [76, 100]
    auto moisture = static_cast<MoistureLevel>(
        (std::clamp(static_cast<uint32_t>(moistures.get(pos)), 0u, 100u) + 24) /
        25);
    auto muck_level = muck_to_level(muck.get(pos), pos.template to<int>());
    uint16_t tag =
        encode_criteria(checkboard, dyes.get(pos), muck_level, moisture);
    const auto& samples = get_samples(index, block_id, tag);
    return encode_offset((sample_offset(samples, pos.template to<int>())));
  });
}

inline uint32_t pack_properties(
    const florae::Growth growth, const muck::Muck& muck, auto pos) {
  // Growth bits defined in src/shared/asset_defs/growth.ts
  bool is_wilting = (growth & 0x10) != 0;
  uint32_t packed = 0;
  packed |= is_wilting << 0;
  packed |= muck << 1;
  return packed;
}

inline auto to_material_buffer(
    const BlockSampleTensor& sample_tensor,
    const florae::GrowthTensor& growth,
    const muck::Tensor& muck) {
  return material_properties::to_buffer(
      tensors::map_sparse(sample_tensor, [&](auto pos, auto encoded_offset) {
        return std::optional{BlockData{
            decode_offset(encoded_offset),
            pack_properties(growth.get(pos), muck.get(pos), pos)}};
      }));
}

}  // namespace voxeloo::galois::blocks
