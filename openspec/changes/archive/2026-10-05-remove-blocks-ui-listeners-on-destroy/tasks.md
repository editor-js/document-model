## 1. Tests

- [x] 1.1 Add a Jest setup to `@editorjs/ui` and a `Blocks.spec.ts` asserting that keydown/copy events on the blocks holder are no longer delegated after `destroy()` and that the holder is detached

## 2. Implementation

- [x] 2.1 Register the blocks holder `beforeinput`/`keydown`/`copy` listeners with an `AbortController` signal and abort it in `BlocksUI.destroy()`
- [x] 2.2 Detach the blocks holder in `BlocksUI.destroy()` and the editor wrapper in `EditorjsUI.destroy()`

## 3. Verify

- [x] 3.1 `yarn test`, `yarn lint:ci` and `yarn build` pass for `@editorjs/ui`; `openspec validate remove-blocks-ui-listeners-on-destroy --type change` passes
