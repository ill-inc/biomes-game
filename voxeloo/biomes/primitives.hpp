#pragma once

#include <Eigen/Geometry>
#include <algorithm>
#include <memory>
#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/spatial.hpp"

namespace voxeloo::primitives {

inline auto decay(float threshold, float distance, float decay = 0.5f) {
  return 0.5f + decay * (threshold - distance);
}

namespace xy {

class Node {
 public:
  virtual ~Node() = default;
  virtual float get(const Vec2f& xy) const = 0;
};

class Disk : public Node {
 public:
  explicit Disk(float radius) : radius_(radius) {}

  float get(const Vec2f& xy) const override {
    return std::min(1.0f, std::max(0.0f, decay(radius_, norm(xy))));
  }

 private:
  float radius_;
};

class Rect : public Node {
 public:
  explicit Rect(Vec2f size) : size_(size) {}

  float get(const Vec2f& xy) const override {
    auto dx = decay(size_[0], std::abs(xy[0]));
    auto dy = decay(size_[1], std::abs(xy[1]));
    return std::max(0.0f, std::min({1.0f, dx, dy}));
  }

 private:
  Vec2f size_;
};

class Transformed : public Node {
 public:
  Transformed(std::shared_ptr<Node> child, Vec2f trans, float rot)
      : child_(std::move(child)) {
    auto t = Eigen::Transform<float, 2, Eigen::AffineCompact>::Identity();
    t.translate(Eigen::Vector2f(trans.x, trans.y));
    t.rotate(Eigen::Rotation2D<float>(rot));
    mat_ = t.inverse().matrix();
  }

  float get(const Vec2f& v) const override {
    Eigen::Vector2f u = mat_ * Eigen::Vector3f(v.x, v.y, 1.0f);
    return child_->get({u[0], u[1]});
  }

 private:
  std::shared_ptr<Node> child_;
  Eigen::Matrix<float, 2, 3> mat_;
};

class Union : public Node {
 public:
  explicit Union(std::vector<std::shared_ptr<Node>> nodes)
      : nodes_(std::move(nodes)) {}

  float get(const Vec2f& xy) const override {
    float ret = 0.0f;
    for (const auto& node : nodes_) {
      ret = std::max(ret, node->get(xy));
    }
    return ret;
  }

 private:
  std::vector<std::shared_ptr<Node>> nodes_;
};

inline auto rasterize(
    std::shared_ptr<Node> node,
    const std::array<int, 2>& shape,
    float threshold = 1e-3f) {
  std::vector<std::tuple<int, int, float>> values;

  auto [h, w] = shape;
  for (int y = 0; y < h; y += 1) {
    for (int x = 0; x < w; x += 1) {
      Vec2f xy = {x + 0.5f, y + 0.5f};
      if (auto value = node->get(xy); value >= threshold) {
        values.emplace_back(x, y, value);
      }
    }
  }

  return values;
}

}  // namespace xy

namespace xyz {

class Node {
 public:
  virtual ~Node() = default;
  virtual float get(const Vec3f& xyz) const = 0;
};

class Ball : public Node {
 public:
  explicit Ball(float radius) : radius_(radius) {}

  float get(const Vec3f& xyz) const override {
    return std::min(1.0f, std::max(0.0f, decay(radius_, norm(xyz))));
  }

 private:
  float radius_;
};

class Box : public Node {
 public:
  explicit Box(Vec3f size) : size_(size) {}

  float get(const Vec3f& xyz) const override {
    auto dx = decay(size_[0], std::abs(xyz[0]));
    auto dy = decay(size_[1], std::abs(xyz[1]));
    auto dz = decay(size_[2], std::abs(xyz[2]));
    return std::max(0.0f, std::min({1.0f, dx, dy, dz}));
  }

 private:
  Vec3f size_;
};

class Transformed : public Node {
 public:
  Transformed(std::shared_ptr<Node> child, Vec3f trans, Vec4f rot)
      : child_(std::move(child)) {
    auto t = Eigen::Transform<float, 3, Eigen::AffineCompact>::Identity();
    t.translate(Eigen::Vector3f(trans.x, trans.y, trans.z));
    t.rotate(Eigen::Quaternion<float>(rot.x, rot.y, rot.z, rot.w));
    mat_ = t.inverse().matrix();
  }

  float get(const Vec3f& v) const override {
    Eigen::Vector3f u = mat_ * Eigen::Vector4f(v.x, v.y, v.z, 1.0f);
    return child_->get({u[0], u[1], u[2]});
  }

 private:
  std::shared_ptr<Node> child_;
  Eigen::Matrix<float, 3, 4> mat_;
};

class Union : public Node {
 public:
  explicit Union(std::vector<std::shared_ptr<Node>> nodes)
      : nodes_(std::move(nodes)) {}

  float get(const Vec3f& xyz) const override {
    float ret = 0.0f;
    for (const auto& node : nodes_) {
      ret = std::max(ret, node->get(xyz));
    }
    return ret;
  }

 private:
  std::vector<std::shared_ptr<Node>> nodes_;
};

inline auto rasterize(
    std::shared_ptr<Node> node,
    const std::array<int, 3>& shape,
    float threshold = 1e-3f) {
  std::vector<std::tuple<int, int, int, float>> values;

  auto [d, h, w] = shape;
  for (int z = 0; z < d; z += 1) {
    for (int y = 0; y < h; y += 1) {
      for (int x = 0; x < w; x += 1) {
        Vec3f xyz = {x + 0.5f, y + 0.5f, z + 0.5f};
        if (auto value = node->get(xyz); value >= threshold) {
          values.emplace_back(x, y, z, value);
        }
      }
    }
  }

  return values;
}

}  // namespace xyz

}  // namespace voxeloo::primitives
