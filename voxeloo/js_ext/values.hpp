#pragma once

#include <cstdint>
#include <string>

namespace voxeloo::values::js {

template <typename Val>
inline std::string value_type();

template <>
inline std::string value_type<bool>() {
  return "Bool";
}

template <>
inline std::string value_type<int8_t>() {
  return "I8";
}

template <>
inline std::string value_type<int16_t>() {
  return "I16";
}

template <>
inline std::string value_type<int32_t>() {
  return "I32";
}

template <>
inline std::string value_type<uint8_t>() {
  return "U8";
}

template <>
inline std::string value_type<uint16_t>() {
  return "U16";
}

template <>
inline std::string value_type<uint32_t>() {
  return "U32";
}

template <>
inline std::string value_type<float>() {
  return "F32";
}

template <>
inline std::string value_type<double>() {
  return "F64";
}

}  // namespace voxeloo::values::js