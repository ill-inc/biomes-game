#include "voxeloo/common/boxifier.hpp"

#include "voxeloo/common/format.hpp"

namespace voxeloo::boxifier {

void Boxifier::push(Run run) {
  if (!runs_.empty() && runs_.back().start.z != run.start.z) {
    CHECK_ARGUMENT(runs_.back().start.z < run.start.z);
    merge();
  }
  if (!out_.empty()) {
    auto& back = out_.back();
    CHECK_ARGUMENT(back.v1.z <= run.start.z);
  }
  if (!prev_.empty()) {
    auto& back = prev_.back();
    CHECK_ARGUMENT(back.v1.z <= run.start.z);
  }
  if (!runs_.empty()) {
    auto& back = runs_.back();
    CHECK_ARGUMENT(back.start.y <= run.start.y);
    if (back.start.y == run.start.y) {
      CHECK_ARGUMENT(back.start.x + back.length <= run.start.x);
      if (back.start.x + back.length == run.start.x) {
        back.length += run.length;
        return;
      }
    }
  }
  runs_.emplace_back(std::move(run));
}

std::vector<Box> Boxifier::build() {
  std::vector<Box> out;
  emit([&](Box box) {
    out.emplace_back(std::move(box));
  });
  return out;
}

template <typename Fn>
inline void merge_y(std::vector<Box>& prev, std::vector<Box>& curr, Fn&& fn) {
  auto match = [](Box& p_b, Box& c_b) {
    return p_b.v0.x == c_b.v0.x && p_b.v1.x == c_b.v1.x && p_b.v1.y == c_b.v0.y;
  };

  auto c_it = curr.begin();
  for (auto p_it = prev.begin(); p_it != prev.end(); ++p_it) {
    while (c_it != curr.end() && c_it->v0.x < p_it->v0.x) {
      ++c_it;
    }
    if (c_it != curr.end() && match(*p_it, *c_it)) {
      c_it->v0 = p_it->v0;
    } else {
      fn(*p_it);
    }
  }
  prev.swap(curr);
  curr.clear();
}

template <typename Fn>
inline void merge_z(std::vector<Box>& prev, std::vector<Box>& curr, Fn&& fn) {
  auto lower = [](Box& p_b, Box& c_b) {
    return c_b.v0.y < p_b.v0.y || (c_b.v0.y == p_b.v0.y && c_b.v0.x < p_b.v0.x);
  };
  auto match = [](Box& p_b, Box& c_b) {
    auto xy_match = p_b.v0.xy() == c_b.v0.xy() && p_b.v1.xy() == c_b.v1.xy();
    return xy_match && p_b.v1.z == c_b.v0.z;
  };

  auto c_it = curr.begin();
  for (auto p_it = prev.begin(); p_it != prev.end(); ++p_it) {
    while (c_it != curr.end() && lower(*p_it, *c_it)) {
      ++c_it;
    }
    if (c_it != curr.end() && match(*p_it, *c_it)) {
      c_it->v0 = p_it->v0;
    } else {
      fn(*p_it);
    }
  }
  prev.swap(curr);
  curr.clear();
}

inline auto merge_runs(std::vector<Run>& runs) {
  std::vector<Box> out;
  std::vector<Box> prev;
  std::vector<Box> curr;
  for (auto& run : runs) {
    if (!curr.empty() && curr.back().v0.y < run.start.y) {
      merge_y(prev, curr, [&](Box box) {
        out.emplace_back(std::move(box));
      });
    }
    curr.push_back(Box{run.start, run.start + vec3(run.length, 1, 1)});
  }
  merge_y(prev, curr, [&](Box box) {
    out.emplace_back(std::move(box));
  });
  merge_y(prev, curr, [&](Box box) {
    out.emplace_back(std::move(box));
  });
  runs.clear();
  std::sort(out.begin(), out.end(), [](const auto& a, const auto& b) {
    auto d = clamp(a.v0 - b.v0, -1, 1);
    return d.x + 2 * d.y + 4 * d.z < 0;
  });
  return out;
}

void Boxifier::merge() {
  auto curr = merge_runs(runs_);
  merge_z(prev_, curr, [&](Box box) {
    out_.emplace_back(std::move(box));
  });
}

}  // namespace voxeloo::boxifier
