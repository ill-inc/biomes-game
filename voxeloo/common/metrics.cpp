#include "voxeloo/common/metrics.hpp"

#include "prometheus/text_serializer.h"

namespace voxeloo::metrics {

prometheus::Registry& registry() {
  static prometheus::Registry registry;
  return registry;
}

auto& metric_exports = BuildCounter()
                           .Name("metric_exports")
                           .Help("Number of exports.")
                           .Register(registry())
                           .Add({});

std::string export_as_text() {
  metric_exports.Increment();
  return prometheus::TextSerializer().Serialize(registry().Collect());
}

}  // namespace voxeloo::metrics