## Context

`FormattingInlineNode.format()` (`packages/model/src/entities/inline-fragments/FormattingInlineNode/index.ts:130`) short-circuits with `return []` whenever `tool === this.tool`, so re-applying a data-carrying inline tool never updates the fragment's `data`. `isEqual()` (line 193) and `mergeWith()` (line 213) ignore `data` as well, so `ParentNode.normalize()` can merge adjacent same-tool fragments that differ only in data. Every `format` op reaches the tree as plain `(tool: InlineToolName, start, end, data)` via `EditorJSModel.format → EditorDocument → BlockNode → ParentInlineNode → FormattingInlineNode`, and these ops are replayed for remote users and undo/redo — so the comparison must be deterministic and must not depend on non-serializable tool objects being threaded through the op.

The `inline-link` tool (`packages/tools/inline-link/src/index.ts:133`) currently works around the model gap by sending `FormattingAction.None` on re-apply, which `SelectionManager` (`packages/core/src/components/SelectionManager.ts:193`) silently ignores (no `None` case) — so the new `href` never reaches the model.

## Goals / Non-Goals

**Goals:**
- Re-applying the same tool with **different** data replaces the affected fragment's data; with **equal** data it stays a no-op (preserves the current optimization for dataless tools like bold).
- Correct behavior when the re-applied range only partially covers an existing fragment (split, replace the middle segment).
- Data equality defaults to a deep structural comparison.
- `isEqual()` / `mergeWith()` become data-aware so normalization never merges distinct-data fragments.
- `inline-link` re-apply sends `FormattingAction.Format` and updates the URL.

**Non-Goals:**
- A full `intersectType` engine (`Extend` / `LeaveBoth`) — only the replace-on-same-tool path is in scope.
- Changing the collaborative op shape or threading functions through it.
- Building the DI registry that lets a tool register a custom comparator — deferred (see Decision 3).

## Decisions

### Decision 1: Deep-equality comparison is the model's default

Add a pure helper (e.g. `isSameInlineData(a?: InlineToolData, b?: InlineToolData): boolean`) performing deep structural equality, treating both-`undefined` as equal. `FormattingInlineNode.format()` uses it: when `tool === this.tool`, return `[]` (no-op) if data is equal, otherwise perform a data replacement. `isEqual()` and `mergeWith()` use the same helper so only truly-equal fragments merge.

### Decision 2: Replace via split, reusing the existing `unformat` pattern

For a same-tool re-apply with different data:
- If `[start, end]` fully covers the node (`0..length`): replace the node's `data` in place.
- If partial: split at `start` and `end` (mirroring `unformat`'s `split` logic) so the middle segment is isolated, and give that middle segment the new `data`.

`data` is currently `readonly`; the implementation will introduce a controlled way to set it (internal setter or reconstruct-and-swap) rather than exposing it publicly.

### Decision 3: Tool-overridable comparator — seam now, wiring deferred

Because the op carries only a tool **name**, a custom comparator must be resolved by name from a model-side registry populated at tool-registration time, not passed through the op. That registry spans `sdk → core → model` and is larger than this change warrants.

**This change:** add an optional `isSameData?(a, b): boolean` to the SDK `InlineTool` interface as a documented extension point, and centralize the model's comparison behind the single `isSameInlineData` helper so the override has an obvious future home. **Deferred:** the DI registry and core wiring that actually resolve a tool's `isSameData` — no built-in tool needs a custom comparator yet (link's `{ href }` is handled correctly by deep equality).

### Decision 4: Remove the link workaround

In `inline-link`, drop the `isActive ? FormattingAction.None : FormattingAction.Format` branch and always send `FormattingAction.Format` with `data: { href: linkInput.value }`. The stale `@todo Replace link…` comment is removed since the model now handles it.
