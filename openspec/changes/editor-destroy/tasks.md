## 1. SDK contracts

- [x] 1.1 Add optional `destroy?(): void` to `InlineTool` and declare it explicitly on `BlockTool` in `packages/sdk/src/entities/{InlineTool,BlockTool}.ts`, with type tests that tools with and without `destroy()` both satisfy their constructor types
- [ ] 1.2 Narrow `EditorJSAdapterPlugin` to a required `destroy(): void` in `packages/sdk/src/entities/EditorjsAdapterPlugin.ts`, and update the test adapter mocks in `packages/core` to implement it

## 2. Signal plumbing (AbortController rule, design D8/D8a)

- [x] 2.1 Add an `options?: AddEventListenerOptions` argument to `EditorJSModel`'s typed `addEventListener` overloads and forward it
- [x] 2.2 Keep the core `DocumentAPI.onUpdate` and `SelectionAPI.onCaretUpdate` tests green (`should stop calling the callback after the returned function is called`) while switching the implementation to a controller per subscription that returns `() => controller.abort()`
- [x] 2.3 Write failing `BlockToolAdapter` tests: `should stop dispatching translated events after destroy`, and `should remove a subclass listener registered with the inherited signal on destroy`. Give the base class its own controller and a `protected readonly signal`, and abort it in `destroy()`
- [ ] 2.4 Make `DOMBlockToolAdapter` pass `this.signal` to its `ui:beforeinput` registration, and remove its `destroy()` override and `#beforeInputListener` field
- [x] 2.5 Move `UndoRedoManager` listener cleanup to one controller, keeping explicit cleanup only for its debounce timer
- [ ] 2.6 Move `ClipboardPlugin`, `ShortcutsPlugin`, and `CollaborationManager` listener cleanup to one controller each. Keep their existing destroy tests green, and keep explicit cleanup only for timers and the socket

## 3. Selection watcher reference counting (dom-adapters)

- [ ] 3.1 Write failing tests in `useSelectionChange.spec.ts`: `should remove the document listener when the last subscriber unsubscribes`, and `should re-add the document listener when a subscriber is added after all were removed`
- [ ] 3.2 Make `off()` detach the `document` listener when the subscriber map empties, and `on()` attach it when the first subscriber is added

## 4. DOMAdapters teardown

- [ ] 4.1 Write failing `CaretAdapter` tests: `should stop updating the model caret on selectionchange after destroy`, and `should not touch the DOM selection on model caret updates after destroy`
- [ ] 4.2 Implement `CaretAdapter.destroy()` by aborting its controller, whose `abort` event is tied to `off(holder)` and the `onCaretUpdate` unsubscribe function. Remove the `@todo`
- [ ] 4.3 Write failing `FormattingAdapter` tests: `should call destroy on attached inline tools`, `should ignore core:ToolLoaded after destroy`, and `should ignore model updates after destroy`
- [ ] 4.4 Implement `FormattingAdapter.destroy()`: abort its controller, then destroy the inline tool instances
- [ ] 4.5 Write failing `DOMAdapters` tests: `should destroy every remaining block adapter on destroy`, `should leave the inputs registry empty after destroy`, and `should destroy caret and formatting adapters on destroy`
- [ ] 4.6 Implement `DOMAdapters.destroy()`

## 5. Core services teardown

- [x] 5.1 Write failing `BlockRenderer` tests: `should call tool destroy when its block is removed`, `should destroy every remaining tool and block adapter on destroy without dispatching BlockRemovedCoreEvent`, `should stop handling model events after destroy`, and `should not dispatch BlockAddedCoreEvent for a render that settles after destroy`
- [x] 5.2 Track tool instances per block id in `BlockRenderer`, subscribe to the model with a controller's signal, add `destroy()`, and remove the `@todo clear block tool adapter memory`
- [x] 5.3 Write a failing `SelectionManager` test, `should stop handling caret updates after destroy`. Implement `SelectionManager.destroy()` by aborting its controller
- [x] 5.4 Write a failing test, `should destroy the throwaway inline tool instance after applying it`, for `SelectionManager.applyInlineTool`, and do the same for the instance created during `ToolsManager` validation. Call `destroy?.()` in a `finally`

## 6. Core.destroy()

- [x] 6.1 Write failing `Core` tests (`packages/core/src/index.spec.ts`): `should call plugin destroy in reverse construction order`, `should unregister plugin public APIs`, `should continue teardown and log when a plugin destroy throws`, `should destroy UndoRedoManager, SelectionManager, BlockRenderer and then the adapter`, `should not emit model events during destroy`, and `should be a no-op when called twice`
- [x] 6.2 Keep plugin instances in `#initializePlugin`, track the initialization stage, and implement `destroy()` in the order from design D3
- [x] 6.3 Write failing tests: `should not construct anything when destroyed before initialize`, `should reject initialize with an AbortError without dispatching ready when destroyed mid-initialization`, and `should throw from use and initialize after destroy`
- [x] 6.4 Implement the `#destroyed` checks after each `await` in `initialize()`, and the post-destroy guards in `use()` and `initialize()`

## 7. UI teardown

- [ ] 7.1 Leave `BlocksUI` to #174, which covers its teardown, so this change has no `BlocksUI` implementation. Reuse #174's UI Jest setup byte-for-byte so the two merge cleanly
- [ ] 7.2 Give each UI plugin except `BlocksUI` (`EditorjsUI`, `ToolbarUI`, `ToolboxUI`, `InlineToolbarUI`) an `AbortController` and pass its `signal` to every EventBus and DOM `addEventListener`. Call `abort()` in `destroy()`
- [ ] 7.3 `EditorjsUI.destroy()` removes the wrapper and leaves the holder in place. `ToolboxUI` and `InlineToolbarUI` destroy their popovers. `InlineToolbarUI` calls `destroy?.()` on the inline tool instances it created, both on rebuild and on destroy
- [ ] 7.4 Add the first UI specs (`packages/ui`): `should remove the editor wrapper but keep the holder on destroy`, and `should not react to EventBus events after destroy` for each plugin

## 8. Bundle and integration

- [x] 8.1 Write a failing `EditorJS` test, `should delegate destroy to Core`, and implement `EditorJS#destroy()`. Add tests that an `AbortError` from `isReady` isn't reported as an unhandled rejection while any other initialization error is logged, and handle that on the bundle's ready promise
- [ ] 8.2 Write the integration test in `packages/editorjs`, `should leave no DOM nodes or document/holder listeners after creating and destroying several editors on one page`, spying on `document`/holder `add/removeEventListener` and checking that the counts balance and the holders are empty
- [ ] 8.3 Add an integration test that destroys the editor before `isReady` settles and checks that `isReady` rejects with an `AbortError` and nothing is rendered
- [ ] 8.4 Check that `CollaborationManager.destroy()` closes the `OTClient` socket when it's reached through `EditorJS#destroy()` (mock WebSocket)

## 9. Docs and wrap-up

- [ ] 9.1 Replace the "`Core` currently does not expose a global `destroy()`" line in `docs/plugins.md` with the teardown contract (order, idempotency, tools' `destroy()`), and add a teardown step to the lifecycle in `docs/README.md`. Update `docs/diagrams/plugin-lifecycle-flow.mmd`
- [ ] 9.2 Run `yarn lint` and the test suites for every touched package
- [ ] 9.3 Run `openspec validate editor-destroy --type change` and make sure it passes
