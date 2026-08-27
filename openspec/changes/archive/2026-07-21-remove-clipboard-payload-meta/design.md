## Context

`ClipboardPlugin` (`packages/plugins/clipboard-plugin/src/index.ts`) writes three flavours of the same selection onto the native clipboard on `ui:copy`: `text/plain`, `text/html`, and a custom `application/x-editor-js` JSON payload. That third payload is currently `{ blocks, meta: { version: '3.0.0' } }`, where the version is a hardcoded literal accompanied by a `@todo get version info from Core`.

Nothing in the repository reads the payload — a repo-wide grep for `application/x-editor-js` finds only the plugin itself, its co-located test, and the capability spec. Paste handling does not exist yet, so this is the last moment where the format can be narrowed without a migration path for internal consumers.

This change is deliberately small: it is a format simplification, not a redesign of clipboard handling. It is recorded as a change rather than a drive-by edit because the payload shape is a documented spec-level requirement.

## Goals / Non-Goals

**Goals:**

- Make the `application/x-editor-js` payload exactly `{ blocks }`.
- Remove the module-private `Meta` interface and the `@todo` that pointed at a version-from-Core plumbing task that no longer needs doing.
- Keep the spec (`openspec/specs/clipboard-plugin/spec.md`) truthful about the emitted shape.

**Non-Goals:**

- Designing or implementing a paste handler that reads the payload.
- Introducing versioning by another route (payload envelope, MIME type suffix, separate clipboard entry). If a future change needs to distinguish formats, it decides then, with a real consumer to design against.
- Changing the MIME type string, the `text/plain` / `text/html` payloads, or the copy-event flow.
- Sourcing an editor version from Core for any other purpose.

## Decisions

**Drop `meta` entirely rather than populate `version` from Core.** The alternative — plumbing a real version through `EditorAPI` into the plugin — was rejected because no consumer needs it. A version field earns its place when something branches on it; adding the plumbing first means maintaining a public format field on speculation. Deleting it is reversible: reintroducing `meta` later is an additive change to the payload, whereas a wrong version value baked into the format is not something readers can recover from.

**Keep `{ blocks }` as an object rather than serializing the bare array.** Emitting `JSON.stringify(blocks)` would be marginally smaller, but the object wrapper is what makes future extension additive — a reader that destructures `{ blocks }` keeps working when a sibling key appears, while a reader parsing a top-level array would break on any envelope change. The wrapper costs eleven bytes.

**No versioning shim or dual-write.** The plugin could write both shapes for a transition period. Rejected: there is no reader to transition, and a dual-write would immediately become the compatibility burden the change exists to avoid.

**Type change is module-private.** `ClipboardEditorJSObject` and `Meta` are not exported from the package, so removing `Meta` alters no published `.d.ts` surface. The break is on the wire only, which is why the proposal marks it BREAKING despite no TypeScript API moving.

## Risks / Trade-offs

**An out-of-repo consumer reads `meta.version` from the clipboard** → Low: the payload has never been documented outside the spec file, the plugin landed recently (`f14b7ce`), and the value it carried was a placeholder, not a real version. Any such consumer was branching on a constant. Accepted without a deprecation window.

**A future paste implementation genuinely needs format discrimination** → Reintroducing a sibling key alongside `blocks` is additive and cheap; the object wrapper decision above preserves that path. Deciding the shape then, against a real reader, produces a better field than the placeholder does now.

**Stryker mutation testing on the plugin flags the simplified factory** → `#createClipboardObject` becomes a near-trivial wrapper, which gives mutation testing less to bite on. This is a reduction in code under test, not a coverage regression; the payload assertion in the co-located spec still pins the exact serialized string.
