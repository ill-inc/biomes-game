#pragma once

#include <memory>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/hashing.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/tensors/arrays.hpp"
#include "voxeloo/tensors/tensors.hpp"
#include "voxeloo/tensors/utils.hpp"

namespace voxeloo::tensors {

template <typename Fn, typename... Args>
using Ret = std::invoke_result_t<Fn, Args...>;

// Value mapping routines

template <typename T, typename Fn>
inline void scan_values(const Array<T>& array, Fn&& fn) {
  scan(array, [&](auto run, const T& val) {
    fn(val);
  });
}

template <typename T, typename Fn>
inline void scan_values(const Tensor<T>& tensor, Fn&& fn) {
  scan_chunks(tensor, [&](auto i, auto pos, const auto& chunk) {
    scan_values(chunk.array, fn);
  });
}

template <typename T, typename Fn>
inline auto map_values(const Array<T>& array, Fn&& fn) {
  ArrayBuilder<Ret<Fn, T>> builder(array.data.size());
  scan(array, [&](auto run, const T& val) {
    builder.add(run.len, fn(val));
  });
  return std::move(builder).build();
}

template <typename T, typename Fn>
inline auto map_values(const Tensor<T>& tensor, Fn&& fn) {
  return map_chunks(tensor, [&](auto i, auto pos, const auto& chunk) {
    return Chunk(map_values(chunk.array, fn));
  });
}

// Dense mapping routines

template <typename T, typename Fn>
inline void scan_dense(const Array<T>& array, Fn&& fn) {
  scan(array, [&](auto run, const T& val) {
    const auto end = run.pos + run.len;
    for (auto pos = run.pos; pos < end; pos += 1) {
      fn(pos, val);
    }
  });
}

template <typename T, typename Fn>
inline void scan_dense(const Tensor<T>& tensor, Fn&& fn) {
  scan_chunks(tensor, [&](auto i, auto origin, const auto& chunk) {
    scan_dense(chunk.array, [&](auto pos, auto val) {
      fn(origin + decode_tensor_pos(pos), val);
    });
  });
}

template <typename T, typename Fn>
inline auto map_dense(const Array<T>& array, Fn&& fn) {
  ArrayBuilder<Ret<Fn, ArrayPos, T>> builder(array.data.size());
  scan(array, [&](auto run, const T& val) {
    const auto end = run.pos + run.len;
    for (auto pos = run.pos; pos < end; pos += 1) {
      builder.add(1, fn(pos, val));
    }
  });
  return std::move(builder).build();
}

template <typename T, typename Fn>
inline auto map_dense(const Tensor<T>& tensor, Fn&& fn) {
  return map_chunks(tensor, [&](auto i, auto origin, const auto& chunk) {
    return Chunk(map_dense(chunk.array, [&](auto pos, auto val) {
      return fn(origin + decode_tensor_pos(pos), val);
    }));
  });
}

// Sparse scanning routines

template <typename T, typename Fn>
inline void scan_sparse(const Array<T>& array, Fn&& fn) {
  scan(array, [&](auto run, const T& val) {
    if (val) {
      const auto end = run.pos + run.len;
      for (auto pos = run.pos; pos < end; pos += 1) {
        fn(pos, val);
      }
    }
  });
}

template <typename T, typename Fn>
inline void scan_sparse(const Tensor<T>& tensor, Fn&& fn) {
  scan_chunks(tensor, [&](auto i, auto origin, const auto& chunk) {
    scan_sparse(chunk.array, [&](auto pos, auto val) {
      fn(origin + decode_tensor_pos(pos), val);
    });
  });
}

template <typename T, typename Fn>
inline auto map_sparse(const Array<T>& array, Fn&& fn) {
  using Ret = Ret<Fn, ArrayPos, T>;
  ArrayBuilder<Ret> builder(array.data.size());
  scan(array, [&](auto run, const T& val) {
    if (val) {
      const auto end = run.pos + run.len;
      for (auto pos = run.pos; pos < end; pos += 1) {
        builder.add(1, fn(pos, val));
      }
    } else {
      builder.add(run.len, Ret());
    }
  });
  return std::move(builder).build();
}

template <typename T, typename Fn>
inline auto map_sparse(const Tensor<T>& tensor, Fn&& fn) {
  return map_chunks(tensor, [&](auto i, auto origin, const auto& chunk) {
    return Chunk(map_sparse(chunk.array, [&](auto pos, auto val) {
      return fn(origin + decode_tensor_pos(pos), val);
    }));
  });
}

// Merging routines.

template <typename T1, typename T2, typename Fn>
inline auto merge(const Array<T1>& a1, const Array<T2>& a2, Fn&& fn) {
  CHECK_ARGUMENT(a1.size() == a2.size());

  auto size = a1.dict.count() + a2.dict.count() - 1;
  ArrayBuilder<Ret<Fn, T1, T2>> builder(size);

  ArrayScanner<T1> s1(a1);
  ArrayScanner<T2> s2(a2);
  while (!s1.done() && !s2.done()) {
    auto end = std::min(s1.end(), s2.end());
    auto val = fn(s1.val(), s2.val());
    builder.add(end - builder.back(), val);
    if (s1.end() == end) {
      s1.next();
    }
    if (s2.end() == end) {
      s2.next();
    }
  }

  return std::move(builder).build();
}

template <typename T1, typename T2, typename Fn>
inline auto merge(const Tensor<T1>& t1, const Tensor<T2>& t2, Fn&& fn) {
  CHECK_ARGUMENT(t1.shape == t2.shape);

  using Out = Ret<Fn, T1, T2>;
  BufferBuilder<ChunkPtr<Out>> builder(shape_len(chunk_div(t1.shape)));
  for (auto i = 0u; i < t1.chunks.size(); i += 1) {
    auto& a1 = t1.chunks[i]->array;
    auto& a2 = t2.chunks[i]->array;
    builder.add(make_chunk_ptr(Chunk<Out>(merge(a1, a2, fn))));
  }
  return Tensor<Out>{t1.shape, std::move(builder).build()};
}

// Diffing routines.

template <typename T1, typename T2, typename Fn>
inline auto diff(const Array<T1>& a1, const Array<T2>& a2, Fn&& fn) {
  CHECK_ARGUMENT(a1.size() == a2.size());
  ArrayPos prev = 0;
  ArrayScanner<T1> s1(a1);
  ArrayScanner<T2> s2(a2);
  while (!s1.done() && !s2.done()) {
    auto end = std::min(s1.end(), s2.end());
    if (s1.val() != s2.val()) {
      fn(ArrayRun{prev, static_cast<ArrayPos>(end - prev)}, s1.val(), s2.val());
    }
    if (s1.end() == end) {
      s1.next();
    }
    if (s2.end() == end) {
      s2.next();
    }
    prev = end;
  }
}

template <typename T1, typename T2, typename Fn>
inline auto diff(const Tensor<T1>& t1, const Tensor<T2>& t2, Fn&& fn) {
  CHECK_ARGUMENT(t1.shape == t2.shape);
  for (auto i = 0u; i < t1.chunks.size(); i += 1) {
    diff(t1.chunks[i]->array, t2.chunks[i]->array, fn);
  }
}

// Finding values in tensors.

template <typename T, typename Pred, typename Fn>
inline auto find(const Array<T>& array, Pred&& pred, Fn&& fn) {
  scan(array, [&](auto run, auto val) {
    if (pred(val)) {
      for (auto i = run.pos; i < run.pos + run.len; i += 1) {
        fn(run.pos, val);
      }
    }
  });
}

template <typename T, typename Pred, typename Fn>
inline auto find(const Tensor<T>& tensor, Pred&& pred, Fn&& fn) {
  scan_chunks(tensor, [&](auto i, auto origin, const auto& chunk) {
    scan(chunk.array, [&](auto run, auto val) {
      if (pred(val)) {
        for (auto i = run.pos; i < run.pos + run.len; i += 1) {
          fn(origin + decode_tensor_pos(i), val);
        }
      }
    });
  });
}

// Testing predicates against a tensor.

template <typename T, typename Pred>
inline auto all(const Array<T>& array, Pred&& pred) {
  for (ArrayScanner<T> scanner(array); !scanner.done(); scanner.next()) {
    if (!pred(scanner.val())) {
      return false;
    }
  }
  return true;
}

template <typename T, typename Pred>
inline auto any(const Array<T>& array, Pred&& pred) {
  return !all(array, [&](auto val) {
    return !pred(val);
  });
}

template <typename T, typename Pred>
inline auto all(const Tensor<T>& tensor, Pred&& pred) {
  for (const auto& chunk : tensor.chunks) {
    if (!all(chunk->array, pred)) {
      return false;
    }
  }
  return true;
}

template <typename T, typename Pred>
inline auto any(const Tensor<T>& tensor, Pred&& pred) {
  return !all(tensor, [&](auto val) {
    return !pred(val);
  });
}

inline auto all(const Array<bool>& array) {
  return all(array, [](auto val) {
    return val;
  });
}

inline auto any(const Array<bool>& array) {
  return any(array, [](auto val) {
    return val;
  });
}

inline auto all(const Tensor<bool>& array) {
  return all(array, [](auto val) {
    return val;
  });
}

inline auto any(const Tensor<bool>& array) {
  return any(array, [](auto val) {
    return val;
  });
}

// Routines for hashing tensors.

template <typename T, typename Hash = std::hash<T>>
inline auto hash(const Array<T>& array) {
  auto hash = 0xd7b6357au;
  tensors::scan(array, [&](auto run, auto val) {
    hash = random_hash(hash + random_hash(run.len + Hash{}(val)));
  });
  return hash;
}

template <typename T, typename Hash = std::hash<T>>
inline auto hash(const Tensor<T>& tensor) {
  auto hashed = 0u;
  for (const auto& chunk : tensor.chunks) {
    hashed = random_hash(hash + hash<T, Hash>(chunk->array));
  }
  return hashed;
}

// Routines performing efficient reductions.

template <typename T, typename Ret, typename Fn>
inline auto reduce(const Tensor<T>& tensor, Ret init, Fn&& fn) {
  scan_chunks(tensor, [&](auto i, auto pos, const auto& chunk) {
    scan(chunk.array, [&](auto run, auto val) {
      init = fn(init, val, run.len);
    });
  });
  return init;
}

template <typename T>
inline auto sum(const Tensor<T>& tensor) {
  return reduce(tensor, 0u, [](auto prev, auto curr, auto n) {
    return prev + curr * n;
  });
}

template <typename T>
inline auto count(const Tensor<T>& tensor) {
  return reduce(tensor, 0u, [](auto prev, auto curr, auto n) {
    return curr ? prev + n : prev;
  });
}

// Routines for flipping directions.

// Routines for efficiently transposing tensors.
// ...

template <typename T>
inline auto to_dense_xzy(const Tensor<T>& tensor) {
  std::vector<T> ret(tensors::shape_len(tensor.shape));
  tensors::scan_sparse(tensor, [&](auto pos, auto val) {
    ret[pos.x + (pos.y * tensor.shape.y + pos.z) * tensor.shape.x] = val;
  });
  return ret;
}

template <typename T>
inline auto to_dense_xyz(const Tensor<T>& tensor) {
  std::vector<T> ret(tensors::shape_len(tensor.shape));
  tensors::scan_sparse(tensor, [&](auto pos, auto val) {
    ret[pos.x + (pos.y + pos.z * tensor.shape.y) * tensor.shape.x] = val;
  });
  return ret;
}

// Routines for scanning a tensor as a set of runs.

template <typename T, typename Fn>
inline auto scan_runs(const Tensor<T>& tensor, Fn&& fn) {
  tensors::scan_chunks(tensor, [&](auto i, auto chunk_pos, const auto& chunk) {
    tensors::scan(chunk.array, [&](auto run, auto val) {
      if (val) {
        partition_run(run, [&](auto pos, auto len) {
          fn(pos, len, val);
        });
      }
    });
  });
}

}  // namespace voxeloo::tensors