#!/bin/bash

# Decide whether the VoiceOver suite needs to run for this pull request.
#
# Deliberately narrower than should-run-ci.sh. That script answers "could this change affect
# @editorjs/editorjs at all", which is true of almost every change in the monorepo; this suite
# drives a real screen reader one test at a time and takes tens of minutes, so running it on
# that signal would put it in the path of every PR. This answers the narrower question: could
# this change alter what a screen reader *announces*.
#
# Usage: bash .github/scripts/should-run-voiceover.sh <base-ref> [--verbose]
# Exits 0 when the suite should run, 1 when it can be skipped.

# Don't exit on error - failures are handled explicitly so the script can fail open
set +e

BASE_REF="${1}"
VERBOSE="${2}"

if [ -z "$BASE_REF" ]; then
  echo "Usage: bash .github/scripts/should-run-voiceover.sh <base-ref> [--verbose]"
  exit 1
fi

debug() {
  if [ "$VERBOSE" = "--verbose" ] || [ "$VERBOSE" = "-v" ]; then
    echo "[DEBUG] $@" >&2
  fi
}

# Paths whose contents decide what assistive technology announces.
#
# - packages/ui/src              roles, accessible names, live regions, the roving tabindex
# - packages/tools/paragraph/src the block's own role/name/aria-placeholder
# - packages/editorjs/src        which tools are mounted, hence what is on screen to announce
# - packages/editorjs/e2e        the suite, its fixtures and its shared helpers
# - yarn.lock                    @editorjs/ui-kit owns the popover roles the suite asserts on,
#                                so a bump to it changes announcements without touching src
# - the CI wiring below          so a change to the gate is validated by the gate itself
#
# packages/core is deliberately absent. It drives selection and caret, which the toolbar reacts
# to, but the structural half of that is already covered on every PR by the headless aria.spec.ts
# suite - what this one adds is announcement verification. Add `packages/core/src` here if a core
# regression ever reaches announcements without aria.spec.ts catching it first.
WATCHED_PATHS=(
  packages/ui/src
  packages/tools/paragraph/src
  packages/editorjs/src
  packages/editorjs/e2e
  packages/editorjs/playwright.voiceover.config.ts
  yarn.lock
  .github/workflows/editorjs.yml
  .github/actions/voiceover-tests
  .github/scripts/should-run-voiceover.sh
)

# Resolve the base ref - same ladder as should-run-ci.sh, for the same reasons
RESOLVED_BASE_REF=""

if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  RESOLVED_BASE_REF="$BASE_REF"
  debug "Resolved base ref as: $BASE_REF"
fi

if [ -z "$RESOLVED_BASE_REF" ] && git rev-parse --verify "origin/$BASE_REF" >/dev/null 2>&1; then
  RESOLVED_BASE_REF="origin/$BASE_REF"
  debug "Resolved base ref as: origin/$BASE_REF"
fi

if [ -z "$RESOLVED_BASE_REF" ]; then
  if git rev-parse --verify "origin/main" >/dev/null 2>&1; then
    RESOLVED_BASE_REF="origin/main"
    debug "Resolved base ref as: origin/main"
  elif git rev-parse --verify "main" >/dev/null 2>&1; then
    RESOLVED_BASE_REF="main"
    debug "Resolved base ref as: main"
  fi
fi

# Fail open: a base ref we cannot resolve means we cannot tell what changed, and a suite that
# silently never runs is worse than one that runs when it did not have to
if [ -z "$RESOLVED_BASE_REF" ]; then
  debug "Warning: could not resolve base ref '$BASE_REF'"
  debug "Assuming the change is relevant (safe for CI)"
  exit 0
fi

debug "Base ref: $RESOLVED_BASE_REF"

CHANGED=$(git diff --name-only "$RESOLVED_BASE_REF...HEAD" -- "${WATCHED_PATHS[@]}" 2>/dev/null)
DIFF_STATUS=$?

# Fail open again: `git diff` erroring (a bad range, a missing object after a shallow fetch)
# is indistinguishable here from "nothing changed", and the two must not be treated alike
if [ $DIFF_STATUS -ne 0 ]; then
  debug "Warning: git diff against $RESOLVED_BASE_REF failed"
  debug "Assuming the change is relevant (safe for CI)"
  exit 0
fi

if [ -n "$CHANGED" ]; then
  debug "✓ Announcement-relevant files changed:"
  debug "$CHANGED"
  exit 0
fi

debug "✗ No announcement-relevant changes"
exit 1
