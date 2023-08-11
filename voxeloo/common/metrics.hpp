#pragma once

#include <string>

#include "prometheus/counter.h"
#include "prometheus/registry.h"

namespace voxeloo::metrics {

using prometheus::BuildCounter;

prometheus::Registry& registry();
std::string export_as_text();

}  // namespace voxeloo::metrics
