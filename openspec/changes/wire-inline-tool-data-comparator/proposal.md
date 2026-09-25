## Why

The change `replace-inline-fragment-data-on-reformat` (archived `2026-07-17`) made the model
data-aware when re-applying an inline tool, using a **deep-equality** default
(`isSameInlineData`, `packages/model/src/utils/isSameInlineData.ts`). As part of that work it
added an optional `isSameData?(a, b)` to the SDK `InlineTool` interface
(`packages/sdk/src/entities/InlineTool.ts`) as a **documented seam only** — the model does not
yet consult it. See that change's `design.md` Decision 3 for the rationale (the wiring spans
sdk → core → model and no built-in tool needed custom equality yet).

This is the deferred follow-up: actually let a tool override the model's default data equality.
Do it when a tool genuinely needs equality that differs from deep structural comparison
(e.g. a mention/comment tool that should treat two fragments as equal ignoring a derived or
display-only field, or normalize a URL before comparing).

## What Changes

- Resolve a tool's `isSameData` comparator inside the model by **tool name**, defaulting to
  `isSameInlineData` when a tool does not provide one.
- The comparator must be registered/looked up at tool-registration time, **not** threaded
  through the `format` op — the op is replayed for remote users / undo-redo and carries only a
  tool name and plain data, so it must stay serializable and deterministic.
- Consume the resolved comparator wherever the model currently calls `isSameInlineData`:
  `FormattingInlineNode.format()` (no-op vs replace), `FormattingInlineNode.isEqual()` /
  `mergeWith()`, and `ParentInlineNode.getFragments()` normalization.
- Remove the `@todo`s left at the seam once wired (`InlineTool.isSameData`,
  `isSameInlineData`).

## Capabilities

### New Capabilities
<!-- None; refines existing behavior. -->

### Modified Capabilities
- `model`: the "Inline text tree" requirement's data-equality default (currently deep
  structural comparison) becomes overridable per inline tool via a comparator resolved by tool
  name.
- `sdk`: the inline-tool contract's `isSameData` moves from a documented-but-unused seam to a
  hook the model actually invokes.

## Impact

- `packages/model` — a comparator registry/resolver keyed by `InlineToolName`; the four call
  sites listed above consult it instead of calling `isSameInlineData` directly.
- `packages/core` — register each tool's `isSameData` into the model at tool-registration time
  (near where tools/IoC are wired).
- `packages/sdk` — `InlineTool.isSameData` doc comment updated (no longer "not yet consulted").

## Notes

This is a **stub** created to track deferred work — proposal only. Specs, design, and tasks
are intentionally not written yet; generate them (e.g. `/opsx:continue
wire-inline-tool-data-comparator` or `/opsx:ff`) when the work is picked up.
