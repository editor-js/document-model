## Why

The `application/x-editor-js` clipboard payload written by `ClipboardPlugin` carries a `meta.version` field that is hardcoded to `'3.0.0'` with a `@todo get version info from Core` — it is not read by anything and there is no paste-side consumer that could act on it. Shipping a placeholder version in a public clipboard format is worse than shipping nothing: any future paste handler that trusts the field would branch on a value that never reflected reality. Removing it now, before a paste handler exists, keeps the format honest and costs nothing.

## What Changes

- **BREAKING** (payload format): the `application/x-editor-js` clipboard payload becomes `{ blocks }` — the `meta` object and its `version` field are removed.
- Delete the `Meta` interface and the `meta` member of `ClipboardEditorJSObject` in `packages/plugins/clipboard-plugin/src/index.ts`.
- Simplify `#createClipboardObject` to return the blocks array wrapper only, dropping the `@todo` about sourcing the version from Core.
- Update the co-located test asserting the serialized payload to expect `{ blocks }`.

The break is contained: no code in this repository reads the payload, and no paste handling exists yet. Third-party readers of the clipboard format, if any exist, must stop expecting `meta`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `clipboard-plugin`: the "Rich clipboard data on copy" requirement changes the shape of the `application/x-editor-js` payload from `{ blocks, meta: { version } }` to `{ blocks }`.

## Impact

- **Code**: `packages/plugins/clipboard-plugin/src/index.ts` (interfaces + `#createClipboardObject`), `packages/plugins/clipboard-plugin/src/index.spec.ts` (payload assertion).
- **Specs**: `openspec/specs/clipboard-plugin/spec.md` — purpose paragraph and the "Populating clipboard data for a block selection" scenario.
- **APIs**: no exported TypeScript API changes; `ClipboardEditorJSObject` and `Meta` are module-private. Only the on-the-wire clipboard payload changes.
- **Dependencies / other packages**: none. `grep` over the repo finds the MIME type referenced only inside the clipboard plugin and its spec.
- **Docs**: `docs/` contains no clipboard documentation, so nothing there is superseded. The plugin README describes the plugin at one line and needs no edit.
