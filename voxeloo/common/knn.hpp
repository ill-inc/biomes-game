#include <cmath>
#include <tuple>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/voxels.hpp"

namespace voxeloo::knn {

struct Bucket {
  size_t offset;
  size_t size;
};

struct Buckets {
  std::vector<Bucket> index;
  std::vector<Vec3f> points;
  std::vector<uint32_t> ids;
};

class BucketKnn {
 public:
  BucketKnn(Vec3i dim, Vec3f scale, Buckets buckets);

  const Bucket& bucket(const Vec3f& query) const;
  size_t index(const Vec3f& query) const;

  inline auto search(const Vec3f& query) const {
    return buckets_.points.at(index(query));
  }

  inline auto id(const Vec3f& query) const {
    return buckets_.ids.at(index(query));
  }

 private:
  Vec3i dim_;
  Vec3f scale_;
  Buckets buckets_;
};

BucketKnn make_bucket_knn(Vec3i shape, const std::vector<Vec3f>& points);

}  // namespace voxeloo::knn
