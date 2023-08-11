#pragma once

#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/tensors/succinct.hpp"

namespace voxeloo::tensors {

using ArrayPos = DictKey;

struct ArrayRun {
  ArrayPos pos;
  ArrayPos len;
};

// A RLE-compressed implementation of a one-dimensional array.
template <typename T>
struct Array {
  RankDict dict;
  Buffer<T> data;

  auto size() const {
    return dict.max() + 1;
  }

  const auto& get(ArrayPos pos) const {
    return data[dict.rank(pos)];
  }
};

template <typename T>
class ArrayBuilder {
 public:
  explicit ArrayBuilder(size_t size = 0) : back_(0), builder_(size) {}

  auto back() const {
    return back_;
  }

  void add(ArrayPos len, T val) {
    if (len > 0) {
      if (back_ == 0 || builder_.template back<1>() != val) {
        builder_.add(back_ + len - 1, val);
      } else {
        builder_.template back<0>() += len;
      }
      back_ += len;
    }
  }

  auto build() && {
    auto [ends, vals] = std::move(builder_).build();
    return Array<T>{make_dict(std::move(ends)), std::move(vals)};
  }

 private:
  ArrayPos back_;
  MultiBufferBuilder<ArrayPos, T> builder_;
};

template <typename T>
inline auto make_array(ArrayPos len, T fill = T()) {
  auto end = static_cast<ArrayPos>(len > 0 ? len - 1 : 0);
  return Array<T>{make_dict(buffer_of<ArrayPos>({end})), buffer_of<T>({fill})};
}

template <typename T>
class ArrayScanner {
 public:
  explicit ArrayScanner(const Array<T>& array)
      : array_(array), scanner_(array.dict) {}

  auto end() const {
    return scanner_.curr().key + 1;
  }

  auto val() const {
    return array_.data[scanner_.curr().rank];
  }

  auto done() const {
    return scanner_.done();
  }

  auto next() {
    return scanner_.next();
  }

  auto skip(ArrayPos pos) {
    return scanner_.skip(pos);
  }

 private:
  const Array<T>& array_;
  RankDictScanner scanner_;
};

template <typename T, typename Fn>
inline void scan(const Array<T>& array, Fn&& fn) {
  ArrayPos rank = 0;
  ArrayPos prev = 0;
  array.dict.scan([&](DictKey key) {
    ArrayRun run{prev, static_cast<ArrayPos>(key - prev + 1)};
    fn(run, array.data[rank++]);
    prev = key + 1;
  });
}

template <typename T>
inline auto storage_size(const Array<T>& array) {
  return sizeof(array) + storage_size(array.data) + array.dict.storage_size();
}

template <typename Archive, typename T>
inline void save(Archive& ar, const Array<T>& array) {
  ar(array.dict);
  ar(array.data);
}

template <typename Archive, typename T>
inline void load(Archive& ar, Array<T>& array) {
  ar(array.dict);
  ar(array.data);
}

template <typename T>
inline auto to_str(const Array<T>& array) {
  std::stringstream ss;
  scan(array, [&](auto run, auto val) {
    if (!ss.str().empty()) {
      ss << ", ";
    }
    ss << run.pos << ":" << run.len << " => " << val;
  });
  return ss.str();
}

}  // namespace voxeloo::tensors