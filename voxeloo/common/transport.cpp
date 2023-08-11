#include "voxeloo/common/transport.hpp"

#include <string>

#include "voxeloo/common/errors.hpp"
#include "zstd.h"

namespace voxeloo::transport {

Blob compress(const BlobView& src) {
  // Compress the blob into the output blob.
  Blob dst(ZSTD_compressBound(src.size()), '\0');
  auto size = ZSTD_compress(dst.data(), dst.size(), src.data(), src.size(), 7);
  CHECK_ARGUMENT(!ZSTD_isError(size));

  // Resize the output blob to fit the compressed size.
  dst.resize(size);
  return dst;
}

Blob decompress(const BlobView& src) {
  // Figure out the decompressed blob size.
  auto size = ZSTD_getDecompressedSize(src.data(), src.size());
  CHECK_ARGUMENT(size);

  // Return the decompressed blob.
  Blob dst(size, '\0');
  auto status = ZSTD_decompress(&dst[0], size, src.data(), src.size());
  CHECK_ARGUMENT(!ZSTD_isError(status));
  return dst;
}

}  // namespace voxeloo::transport