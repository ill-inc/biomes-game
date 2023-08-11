#include "voxeloo/common/knn.hpp"

#include <algorithm>
#include <random>

#include "catch2/catch.hpp"
#include "voxeloo/common/geometry.hpp"

namespace voxeloo {

static auto random() {
  static std::random_device rd;
  static std::mt19937 gen(rd());
  static std::uniform_real_distribution<float> distrib;
  return distrib(gen);
}

TEST_CASE("Test basic BucketKnn usage", "[all]") {
  auto shape = vec3(100, 100, 100);

  // Generate some random points.
  std::vector<Vec3f> points;
  for (int i = 0; i < 1000; i += 1) {
    points.push_back(shape.to<float>() * vec3(random(), random(), random()));
  }

  // Build the KNN data structure.
  auto knn = knn::make_bucket_knn(shape, points);

  for (const auto& query : points) {
    auto test = knn.search(query);
    auto actual = *std::min_element(
        points.begin(), points.end(), [&](const auto& p, const auto& q) {
          return square_norm(query - p) < square_norm(query - q);
        });
    REQUIRE(norm(actual - test) < 1e-3);
  }
}

}  // namespace voxeloo