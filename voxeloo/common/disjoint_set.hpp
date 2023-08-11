#include <unordered_map>

namespace voxeloo {

template <typename Val>
class DisjointSet {
 public:
  auto find(Val val) {
    auto it = map_.find(val);
    if (it == map_.end()) {
      map_[val] = val;
      return val;
    }
    auto& parent = it->second;
    if (parent == val) {
      return val;
    }
    return parent = find(parent);
  }

  void merge(Val a, Val b) {
    auto pa = find(a);
    auto pb = find(b);
    if (pa == pb) {
      return;
    }
    map_[pa] = pb;
  }

 private:
  std::unordered_map<Val, Val> map_;
};

}  // namespace voxeloo