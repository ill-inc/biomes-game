#include "voxeloo/common/knn.hpp"

namespace voxeloo::knn {

BucketKnn::BucketKnn(Vec3i dim, Vec3f scale, Buckets buckets)
    : dim_(dim), scale_(scale), buckets_(std::move(buckets)) {}

const Bucket& BucketKnn::bucket(const Vec3f& query) const {
  auto p = (query * scale_).to<int>();
  CHECK_ARGUMENT(voxels::box_contains(voxels::Box{{0, 0, 0}, dim_}, p));
  return buckets_.index.at(p.x + (p.y + p.z * dim_.y) * dim_.x);
}

size_t BucketKnn::index(const Vec3f& query) const {
  size_t ret = 0;
  auto min_distance = std::numeric_limits<float>::infinity();
  auto [offset, size] = bucket(query);
  for (size_t i = offset; i < offset + size; i += 1) {
    auto distance = square_norm(query - buckets_.points[i]);
    if (distance < min_distance) {
      min_distance = distance;
      ret = i;
    }
  }
  return ret;
}

BucketKnn make_bucket_knn(Vec3i shape, const std::vector<Vec3f>& points) {
  auto step = (shape.to<double>() / std::cbrt(points.size())).to<int>();
  auto dim = (shape - 1) / step + 1;

  // Initialize the buckets.
  Buckets buckets;
  buckets.index.reserve(dim.x * dim.y * dim.z);
  for (int z = 0; z < shape.z; z += step.z) {
    for (int y = 0; y < shape.y; y += step.y) {
      for (int x = 0; x < shape.x; x += step.z) {
        auto r = vec3(x, y, z).to<float>();
        auto s = step.to<float>();

        // Find the distance up to which points are included in the bucket.
        float distance = std::numeric_limits<float>::infinity();
        for (const auto& p : points) {
          auto delta = max(abs(p - r), abs(p - r - s));
          distance = std::min(distance, square_norm(delta));
        }

        // Populate the bucket with points within the maximum distance.
        Bucket bucket;
        bucket.size = 0;
        bucket.offset = buckets.points.size();
        for (uint32_t i = 0; i < points.size(); i += 1) {
          const auto& p = points[i];
          auto delta = max(max(0.0f, r - p), max(0.0f, p - r - s));
          if (square_norm(delta) <= distance) {
            buckets.points.push_back(p);
            buckets.ids.push_back(i);
            bucket.size += 1;
          }
        }
        buckets.index.push_back(bucket);
      }
    }
  }

  return BucketKnn(dim, 1.0f / step.to<float>(), std::move(buckets));
}

}  // namespace voxeloo::knn
