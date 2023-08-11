#!/bin/sh
set -e

# Remove source map (e.g. ".map") files from the (public) static directory, and
# put them into a separate directory dedicated to containing private files
# that are only available server-side.

SOURCE_MAPS_FILE_PATTERN="*.map"

cd .next
find . -name "${SOURCE_MAPS_FILE_PATTERN}" \
    -exec sh -c 'SOURCE_MAPS_FILE_DIR=.next-source-maps && mkdir -p ../${SOURCE_MAPS_FILE_DIR}/$(dirname {}) && mv {} ../${SOURCE_MAPS_FILE_DIR}/{}' \; && \

# The last line of each file is expected to be a comment linking to the source
# map, but we since our source maps aren't public and are only intended to be
# applied server side, we have no use for this annotation (and Chrome DevTools
# raises errors about not being able to find the source map). So we remove it
# here.
find . -name "*.js" \
    -exec sh -c '(tail -1 {} | grep -q "//# sourceMappingURL=") && head -n -1 {} > {}.new && mv {}.new {}' \;
find . -name "*.css" \
    -exec sh -c '(tail -1 {} | grep -q "/*# sourceMappingURL=") && head -n -1 {} > {}.new && mv {}.new {}' \;

# Double check that the source files are removed.
test $(find . -name "${SOURCE_MAPS_FILE_PATTERN}" | wc -l) -eq 0
