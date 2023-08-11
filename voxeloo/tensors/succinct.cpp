#include "voxeloo/tensors/succinct.hpp"

#include <optional>
#include <vector>

#include "voxeloo/common/bits.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/tensors/buffers.hpp"

namespace voxeloo::tensors {

namespace {
void push(std::vector<uint32_t>& level) {
  auto n = level.size();
  level.push_back(level[n - 2] + popcount(level[n - 1]));
  level.push_back(0);
};
}  // namespace

RankDict make_dict(const Buffer<DictKey>& keys) {
  if (keys.size() == 0) {
    return RankDict();
  }

  CHECK_ARGUMENT(keys[keys.size() - 1] <= kMaxDictKey);
  for (auto i = 1u; i < keys.size(); i += 1) {
    CHECK_ARGUMENT(keys[i - 1] < keys[i]);
  }

  // Initialize the level vectors.
  std::vector<uint32_t> level_0 = {0, 0};
  std::vector<uint32_t> level_1 = {0, 0};
  std::vector<uint32_t> level_2 = {0, 0};

  // Pad the levels to handle queries beyond the range.
  for (auto i = 0u; i < keys.size(); i += 1) {
    auto key = keys[i];
    auto k_0 = detail::extract_key_part<0>(key);
    auto k_1 = detail::extract_key_part<1>(key);
    auto k_2 = detail::extract_key_part<2>(key);
    if (i > 0) {
      auto misses_0 = detail::extract_key_part<0>(keys[i - 1]) != k_0;
      auto misses_1 = detail::extract_key_part<1>(keys[i - 1]) != k_1;
      if (misses_0) {
        push(level_1);
      }
      if (misses_0 || misses_1) {
        push(level_2);
      }
    }
    level_0.back() |= 1 << k_0;
    level_1.back() |= 1 << k_1;
    level_2.back() |= 1 << k_2;
  }

  // Pad the levels to handle queries beyond the range.
  push(level_1);
  push(level_2);

  // Each level is populated, record their sizes for later use.
  const auto n_0 = level_0.size();
  const auto n_1 = level_1.size();
  const auto n_2 = level_2.size();

  // Update the interior level cumsums to be absolute offets.
  level_0[0] = 1;
  for (uint16_t i = 0; i < n_1; i += 2) {
    level_1[i] += static_cast<uint32_t>(1 + (n_1 >> 1));
  }

  // Output the combined levels.
  auto buffer = make_buffer<uint32_t>(n_0 + n_1 + n_2);
  std::move(level_0.begin(), level_0.end(), &buffer[0]);
  std::move(level_1.begin(), level_1.end(), &buffer[n_0]);
  std::move(level_2.begin(), level_2.end(), &buffer[n_0 + n_1]);
  return RankDict(keys[keys.size() - 1], std::move(buffer));
}

}  // namespace voxeloo::tensors
