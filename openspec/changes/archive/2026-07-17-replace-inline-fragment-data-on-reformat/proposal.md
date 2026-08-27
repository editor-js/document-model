## Why

When a data-carrying inline tool (like **link**) is re-applied over a range that already has that same tool, the new data is silently dropped — editing a link's URL does nothing and the old `href` sticks. The root cause is in the model: `FormattingInlineNode.format()` returns early whenever the tool matches an already-applied tool, never comparing or replacing `data`. Because the model can't do this, the `inline-link` tool works around it by sending a no-op `FormattingAction.None` on re-apply, so the new value never even reaches the model.

## What Changes

- `FormattingInlineNode.format()` stops no-op'ing on same-tool re-apply. When the same tool is re-applied with **different data**, the fragment's data is replaced; when the data is unchanged, it stays a no-op (preserving the current optimization for tools like bold that carry no data).
- Data equality defaults to a deep comparison, but an inline tool MAY provide its own comparator so it can decide what "same data" means for its fragments.
- Node normalization becomes data-aware: `isEqual()` / `mergeWith()` account for `data`, so adjacent same-tool fragments with different data are not incorrectly treated as equal or merged together (which would silently resurrect stale data).
- The `inline-link` tool stops sending the `FormattingAction.None` workaround and sends `FormattingAction.Format` with the new data on re-apply, now that the model handles replacement.

## Capabilities

### New Capabilities
<!-- None; this refines existing behavior. -->

### Modified Capabilities
- `model`: the "Inline text tree" requirement gains data-aware re-formatting — re-applying the same data-carrying tool over a fragment replaces its data (deep-equality default, tool-overridable comparator) instead of being a no-op, and normalization no longer merges same-tool fragments whose data differs.
- `tools`: the "Inline link tool" requirement changes so that confirming a URL on an already-linked selection re-applies the link with the new `href` via `FormattingAction.Format`, rather than the current `FormattingAction.None` no-op.

## Impact

- `packages/model/src/entities/inline-fragments/FormattingInlineNode/index.ts`: make `format()`, `isEqual()`, and `mergeWith()` data-aware.
- `packages/model-types` / `packages/sdk` (`InlineTool`): expose the optional per-tool data comparator so tools can override deep equality.
- `packages/tools/inline-link/src/index.ts`: remove the `FormattingAction.None` re-apply workaround; send `FormattingAction.Format` with the new data.
