#!/bin/bash

# Detect if a package needs CI to run
# Checks if the package or any of its dependencies (direct or transitive) have changed
# Usage: ./scripts/should-run-ci.sh <base-ref> <package-working-directory>

BASE_REF="${1}"
PKG_DIR="${2}"

if [ -z "$BASE_REF" ] || [ -z "$PKG_DIR" ]; then
  echo "Usage: ./scripts/should-run-ci.sh <base-ref> <package-working-directory>"
  exit 1
fi

# Helper function to get all dependencies (direct and transitive)
get_all_deps() {
  local pkg=$1
  local visited=$2

  # Avoid infinite loops
  if echo "$visited" | grep -q "^$pkg$"; then
    return
  fi

  visited="$visited $pkg"

  # Get direct dependencies
  local deps=$(grep -o '"@editorjs/[^"]*"' "packages/$pkg/package.json" 2>/dev/null | sed 's/"//g' | sed 's/@editorjs\///' || true)

  echo "$deps"

  # Recursively get dependencies of dependencies
  for dep in $deps; do
    get_all_deps "$dep" "$visited"
  done
}

# Check if this package changed
if git diff --name-only "$BASE_REF...HEAD" | grep -q "^${PKG_DIR}/"; then
  exit 0
fi

# Get ALL dependencies (direct and transitive)
PKG_NAME=$(basename "$PKG_DIR")
ALL_DEPS=$(get_all_deps "$PKG_NAME" "" | sort -u)

# Check if any dependency (direct or indirect) changed
for dep in $ALL_DEPS; do
  # Map package name to directory - try exact match and underscore variant
  DEP_DIR=$(find packages -maxdepth 1 -type d \( -name "$dep" -o -name "$(echo $dep | sed 's/-/_/g')" \) 2>/dev/null | head -1)
  if [ -n "$DEP_DIR" ] && git diff --name-only "$BASE_REF...HEAD" | grep -q "^$DEP_DIR/"; then
    exit 0
  fi
done

exit 1

