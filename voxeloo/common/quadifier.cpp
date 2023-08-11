#include "voxeloo/common/quadifier.hpp"

namespace voxeloo::quadifier {

std::vector<Quad> merge(std::vector<Vec2i> cells) {
  CHECK_ARGUMENT(!cells.empty());

  // Helper routine to merge stacks.
  auto push_one = [](auto& dst, auto& src) {
    dst.push_back(std::move(src.back()));
    src.pop_back();
  };
  auto push_all = [&](auto& dst, auto& src) {
    while (!src.empty()) {
      push_one(dst, src);
    }
  };

  // Sort cells to process them in xy-order.
  std::sort(cells.begin(), cells.end(), [](auto a, auto b) {
    return a.y < b.y || (a.y == b.y && a.x < b.x);
  });

  // Add a sentinel cell to the back.
  cells.push_back(cells.back() + 2);

  // Process each cell one-by-one with greedy quad merging.
  std::vector<Quad> out;
  std::vector<Quad> prev;
  std::vector<Quad> curr;
  for (const auto& [x, y] : cells) {
    if (!curr.empty()) {
      auto& cb = curr.back();
      if (cb.v1.x == x && cb.v0.y == y) {
        cb.v1.x += 1;
        continue;
      }
      while (!prev.empty()) {
        auto& pb = prev.back();
        if (pb.v1.x > cb.v1.x) {
          break;
        } else if (pb.v0.x == cb.v0.x && pb.v1.x == cb.v1.x) {
          cb.v0.y = pb.v0.y;
          prev.pop_back();
          break;
        } else {
          push_one(out, prev);
        }
      }
      if (cb.v1.y == y) {
        push_all(out, prev);
        push_all(prev, curr);
      } else if (cb.v1.y < y) {
        push_all(prev, curr);
        push_all(out, prev);
      }
    }
    curr.push_back(Quad{{x, y}, {x + 1, y + 1}});
  }

  return out;
}
}  // namespace voxeloo::quadifier