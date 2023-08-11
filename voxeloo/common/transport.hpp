#pragma once

#include <cereal/archives/json.hpp>
#include <cereal/archives/portable_binary.hpp>
#include <cereal/external/base64.hpp>
#include <cstdint>
#include <sstream>
#include <string>
#include <string_view>

#include "voxeloo/common/errors.hpp"

namespace voxeloo::transport {

using Blob = std::string;
using BlobView = std::string_view;

using Json = std::string;
using JsonView = std::string_view;

// Declare compression routines.
Blob compress(const BlobView& src);
Blob decompress(const BlobView& src);

template <typename Data>
inline auto to_blob(const Data& data) {
  std::stringstream ss;
  {
    cereal::PortableBinaryOutputArchive ar(ss);
    ar(data);
  }
  return ss.str();
}

template <typename Data>
inline void from_blob(Data& data, Blob blob) {
  std::stringstream ss(std::move(blob));
  cereal::PortableBinaryInputArchive ar(ss);
  ar(data);
}

template <typename Data>
inline auto from_blob(Data& data, const uint8_t* blob, size_t size) {
  return from_blob(data, Blob(reinterpret_cast<const char*>(blob), size));
}

template <typename Data>
inline auto from_blob(Blob blob) {
  Data data;
  from_blob(data, std::move(blob));
  return data;
}

template <typename Data>
inline auto to_compressed_blob(const Data& data) {
  return compress(to_blob(data));
}

template <typename Data>
inline auto from_compressed_blob(Data& data, const BlobView& blob) {
  return from_blob(data, decompress(blob));
}

template <typename Data>
inline auto from_compressed_blob(Data& data, const uint8_t* blob, size_t size) {
  BlobView view(reinterpret_cast<const char*>(blob), size);
  return from_compressed_blob(data, view);
}

template <typename Data>
inline auto from_compressed_blob(const BlobView& blob) {
  return from_blob<Data>(decompress(blob));
}

template <typename Data>
inline auto from_compressed_blob(const uint8_t* blob, size_t size) {
  BlobView view(reinterpret_cast<const char*>(blob), size);
  return from_compressed_blob<Data>(view);
}

template <typename Data>
inline Json to_json(const Data& data) {
  std::stringstream ss;
  {
    cereal::JSONOutputArchive ar(ss);
    ar(data);
  }
  return ss.str();
}

template <typename Data>
inline auto from_json(Json json) {
  Data data;
  {
    std::stringstream ss(std::move(json));
    cereal::JSONInputArchive ar(ss);
    ar(data);
  }
  return data;
}

inline auto to_base64(const uint8_t* blob, size_t size) {
  return cereal::base64::encode(blob, size);
}

inline auto to_base64(const Blob& blob) {
  return to_base64(reinterpret_cast<const uint8_t*>(blob.c_str()), blob.size());
}

inline auto from_base64(const Blob& blob) {
  return cereal::base64::decode(blob);
}

template <typename T, typename Archive>
inline auto get(Archive& ar) {
  T ret;
  ar(ret);
  return ret;
}

}  // namespace voxeloo::transport
