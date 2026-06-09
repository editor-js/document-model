#!/bin/bash

# Detect if a package needs CI to run
# Checks if the package or any of its dependencies (direct or transitive) have changed
# Usage: bash .github/scripts/should-run-ci.sh <base-ref> <package-working-directory> [--verbose]

# Don't exit on error - we'll handle errors explicitly
set +e

BASE_REF="${1}"
PKG_DIR="${2}"
VERBOSE="${3}"

if [ -z "$BASE_REF" ] || [ -z "$PKG_DIR" ]; then
  echo "Usage: bash .github/scripts/should-run-ci.sh <base-ref> <package-working-directory> [--verbose]"
  exit 1
fi

# Function for verbose logging
debug() {
  if [ "$VERBOSE" = "--verbose" ] || [ "$VERBOSE" = "-v" ]; then
    echo "[DEBUG] $@" >&2
  fi
}

# Try to resolve the base ref - try multiple variants
RESOLVED_BASE_REF=""

# Try 1: As-is (for local branches like "main")
if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  RESOLVED_BASE_REF="$BASE_REF"
  debug "Resolved base ref as: $BASE_REF"
fi

# Try 2: With origin/ prefix (for remote-tracking branches)
if [ -z "$RESOLVED_BASE_REF" ] && git rev-parse --verify "origin/$BASE_REF" >/dev/null 2>&1; then
  RESOLVED_BASE_REF="origin/$BASE_REF"
  debug "Resolved base ref as: origin/$BASE_REF"
fi

# Try 3: Hardcoded main/master (for GitHub Actions or when base_ref not provided properly)
if [ -z "$RESOLVED_BASE_REF" ]; then
  if git rev-parse --verify "origin/main" >/dev/null 2>&1; then
    RESOLVED_BASE_REF="origin/main"
    debug "Resolved base ref as: origin/main"
  elif git rev-parse --verify "main" >/dev/null 2>&1; then
    RESOLVED_BASE_REF="main"
    debug "Resolved base ref as: main"
  fi
fi

# If still couldn't resolve, assume all changes are relevant (safe default for CI)
if [ -z "$RESOLVED_BASE_REF" ]; then
  debug "Warning: Could not resolve base ref '$BASE_REF'"
  debug "Assuming all changes are relevant (safe for CI)"
  exit 0
fi

# Helper function to get all dependencies (direct and transitive)
get_all_deps() {
  local pkg=$1
  local visited=$2
  local depth=${3:-0}

  # Limit recursion depth to prevent infinite loops
  if [ "$depth" -gt 10 ]; then
    return
  fi

  # Avoid infinite loops
  if echo "$visited" | grep -q "^$pkg$"; then
    return
  fi

  visited="$visited $pkg"

  # Get direct dependencies (if package.json exists)
  if [ ! -f "packages/$pkg/package.json" ]; then
    return
  fi

  local deps=$(grep -o '"@editorjs/[^"]*"' "packages/$pkg/package.json" 2>/dev/null | sed 's/"//g' | sed 's/@editorjs\///' || true)

  echo "$deps"

  # Recursively get dependencies of dependencies
  for dep in $deps; do
    get_all_deps "$dep" "$visited" $((depth + 1))
  done
}

# Check if this package changed
# Normalize the package directory path for comparison (remove leading ./)
NORMALIZED_PKG_DIR=$(echo "$PKG_DIR" | sed 's|^\.\/||')

# Get the package name for dependency checking
PKG_NAME=$(basename "$PKG_DIR")

debug "Checking package: $PKG_NAME (dir: $PKG_DIR)"
debug "Base ref: $RESOLVED_BASE_REF"

GIT_DIFF_OUTPUT=$(git diff --name-only "$RESOLVED_BASE_REF...HEAD" -- "$PKG_DIR" 2>/dev/null)

if echo "$GIT_DIFF_OUTPUT" | grep -q "^$NORMALIZED_PKG_DIR/"; then
  debug "✓ Package $PKG_NAME has changed"
  exit 0
fi

debug "Package $PKG_NAME has not changed, checking dependencies..."

# Get ALL dependencies (direct and transitive)
ALL_DEPS=$(get_all_deps "$PKG_NAME" "" 0 | sort -u)

if [ -n "$ALL_DEPS" ]; then
  debug "Dependencies: $(echo $ALL_DEPS | tr '\n' ' ')"
else
  debug "No dependencies found"
fi

# Check if any dependency (direct or indirect) changed
for dep in $ALL_DEPS; do
  # Map package name to directory - try exact match and underscore variant
  DEP_DIR=$(find packages -maxdepth 1 -type d \( -name "$dep" -o -name "$(echo $dep | sed 's/-/_/g')" \) 2>/dev/null | head -1)
  if [ -n "$DEP_DIR" ]; then
    # Normalize for git diff output (remove leading ./)
    NORMALIZED_DEP_DIR=$(echo "$DEP_DIR" | sed 's|^\.\/||')
    if git diff --name-only "$RESOLVED_BASE_REF...HEAD" -- "$DEP_DIR" 2>/dev/null | grep -q "^$NORMALIZED_DEP_DIR/"; then
      debug "✓ Dependency $dep (in $DEP_DIR) has changed"
      exit 0
    fi
  fi
done

debug "✗ No changes detected in $PKG_NAME or its dependencies"
exit 1

