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

# Build an index of workspace packages: one "<package-name> <directory>" record per line.
# Locations come from yarn itself, so any workspace layout (nested roots like packages/tools/*
# and packages/plugins/*, or anything added later) is picked up without teaching this script
# about it. The root workspace (location ".") is dropped: it is not a package that can change.
# Both field orders are accepted so a change in yarn's output ordering cannot silently break this.
build_workspace_index() {
  yarn workspaces list --json 2>/dev/null \
    | sed -n -e 's/.*"location":"\([^"]*\)","name":"\([^"]*\)".*/\2 \1/p' \
             -e 's/.*"name":"\([^"]*\)","location":"\([^"]*\)".*/\1 \2/p' \
    | grep -v ' \.$'
}

WORKSPACES=$(build_workspace_index)

# Fail open: if the workspace list is unavailable (no yarn, no node, unexpected output),
# run CI instead of silently skipping it - a false negative here means a package is never
# validated on the PR, which is far worse than an unnecessary run.
if [ -z "$WORKSPACES" ]; then
  debug "Warning: could not list workspaces via yarn"
  debug "Assuming all changes are relevant (safe for CI)"
  exit 0
fi

# Resolve a workspace package name to its directory (empty if it is not a workspace package)
dir_for_pkg() {
  printf '%s\n' "$WORKSPACES" | awk -v n="$1" '$1 == n { print $2; exit }'
}

# Resolve a workspace directory to its package name (empty if it is not a workspace package)
name_for_dir() {
  printf '%s\n' "$WORKSPACES" | awk -v d="$1" '$2 == d { print $1; exit }'
}

# Collect all workspace dependencies (direct and transitive) into VISITED.
# VISITED doubles as the loop guard, so cycles terminate the walk instead of being
# bounded by an arbitrary recursion depth.
VISITED=""

collect_deps() {
  local pkg=$1
  local dir deps dep

  case " $VISITED " in
    *" $pkg "*) return ;;
  esac

  VISITED="$VISITED $pkg"

  # Packages outside the workspaces (e.g. @editorjs/editorjs, @editorjs/helpers) have no local directory
  dir=$(dir_for_pkg "$pkg")
  [ -n "$dir" ] || return

  # Every @editorjs/* mention in the manifest counts (dependencies, devDependencies, peerDependencies).
  # The package's own "name" is matched too, but the loop guard above absorbs it.
  deps=$(grep -o '"@editorjs/[^"]*"' "$dir/package.json" 2>/dev/null | tr -d '"' | sort -u || true)

  for dep in $deps; do
    collect_deps "$dep"
  done
}

# Check if this package changed
# Normalize the package directory path so it can be matched against yarn's locations
NORMALIZED_PKG_DIR=$(echo "$PKG_DIR" | sed 's|^\.\/||' | sed 's|/$||')

# Get the package name for dependency checking (directory name is only a fallback)
PKG_NAME=$(name_for_dir "$NORMALIZED_PKG_DIR")
if [ -z "$PKG_NAME" ]; then
  PKG_NAME=$(basename "$NORMALIZED_PKG_DIR")
  debug "Warning: $NORMALIZED_PKG_DIR is not a known workspace, falling back to name '$PKG_NAME'"
fi

debug "Checking package: $PKG_NAME (dir: $PKG_DIR)"
debug "Base ref: $RESOLVED_BASE_REF"

# `git diff -- <dir>` already restricts its output to that directory, and the pathspec is
# path-component aware (`-- packages/model` does not match packages/model-types/), so a
# non-empty result is the answer - no second pass over the paths is needed.
if [ -n "$(git diff --name-only "$RESOLVED_BASE_REF...HEAD" -- "$PKG_DIR" 2>/dev/null)" ]; then
  debug "✓ Package $PKG_NAME has changed"
  exit 0
fi

debug "Package $PKG_NAME has not changed, checking dependencies..."

# Get ALL dependencies (direct and transitive), excluding the package itself
collect_deps "$PKG_NAME"
ALL_DEPS=$(printf '%s\n' $VISITED | grep -v "^$PKG_NAME$" | sort -u)

if [ -n "$ALL_DEPS" ]; then
  debug "Dependencies: $(echo $ALL_DEPS | tr '\n' ' ')"
else
  debug "No dependencies found"
fi

# Check if any dependency (direct or indirect) changed
for dep in $ALL_DEPS; do
  DEP_DIR=$(dir_for_pkg "$dep")
  if [ -n "$DEP_DIR" ]; then
    if [ -n "$(git diff --name-only "$RESOLVED_BASE_REF...HEAD" -- "$DEP_DIR" 2>/dev/null)" ]; then
      debug "✓ Dependency $dep (in $DEP_DIR) has changed"
      exit 0
    fi
  fi
done

debug "✗ No changes detected in $PKG_NAME or its dependencies"
exit 1

