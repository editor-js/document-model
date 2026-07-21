## 1. Tests first

- [x] 1.1 In `packages/plugins/clipboard-plugin/src/index.spec.ts`, update the existing `'should add custom editorjs data-type to native event'` case so the expected `setData` payload is `JSON.stringify({ blocks: [...] })` with no `meta` key; confirm it fails against the current implementation
- [x] 1.2 Add a case named in should-notation — e.g. `it('should not include meta in the editorjs clipboard payload', ...)` — that parses the `application/x-editor-js` argument passed to `setData` and asserts `Object.keys(parsed)` equals `['blocks']`; confirm it fails

## 2. Implementation

- [x] 2.1 In `packages/plugins/clipboard-plugin/src/index.ts`, delete the `Meta` interface and the `meta` member (with its doc comment) from `ClipboardEditorJSObject`
- [x] 2.2 Simplify `#createClipboardObject` to return `{ blocks }`, removing the `meta` literal and the `@todo get version info from Core` comment
- [x] 2.3 Update the `#createClipboardObject` doc comment so it no longer says the object carries metadata
- [x] 2.4 Run `yarn workspace @editorjs/clipboard-plugin test` and confirm both tests from group 1 now pass with no other regressions

## 3. Spec and docs alignment

- [x] 3.1 Update `openspec/specs/clipboard-plugin/spec.md` — change the Purpose paragraph and the "Populating clipboard data for a block selection" scenario from `{ blocks, meta: { version } }` to `{ blocks }`, and add the "Omitting metadata from the EditorJS payload" scenario from the delta spec
- [x] 3.2 Run `openspec validate remove-clipboard-payload-meta` and resolve any reported issues

## 4. Verification

- [x] 4.1 Run `yarn lint` scoped to the clipboard plugin and fix any findings introduced by the edit
- [x] 4.2 Grep the repo for `meta` and `x-editor-js` within `packages/plugins/clipboard-plugin` to confirm no stale references to the removed field remain outside `dist/`, `coverage/`, and `reports/`
- [x] 4.3 Run `yarn workspace @editorjs/clipboard-plugin test:mutations` if the package's Stryker config is part of CI, and confirm the score has not regressed below its configured threshold
