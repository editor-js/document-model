## Context

Core's `UndoRedoManager` (`packages/core/src/components/UndoRedoManager.ts`) listens to `EventType.Changed` on `EditorJSModel`. It ignores events whose `detail.userId` isn't the local user. It collects the rest into `#batch` and moves the batch onto `#undoStack` either after 500 ms without new events, or when `#canAddToBatch` rejects the next event. `#canAddToBatch` accepts only a text insert or remove that directly continues the previous one in the same `blockIndex`/`dataKey`. An undo step is already a list of events, and `undo()`/`redo()` replay the whole list. So the only thing preventing a multi-operation action from being a single step is the batching rule.

How the model attributes events:

- `utils/Context.ts` keeps a module-level stack. `@WithContext` pushes each `EditorJSModel` method's first argument (the `userId`) onto it for the duration of the call.
- Event-creation sites read `getContext()` (21 sites across `EditorDocument`, `BlockNode`, `BlockTune`, `ValueNode`, `ParentInlineNode` and `EditorJSModel`).
- Events are **re-created** at each bubbling level:
  - `BlockNode` for text, value and tune events;
  - `EditorDocument.#listenAndBubbleBlockEvent`, which passes only `(index, data)`;
  - `EditorJSModel.#listenAndBubbleDocumentEvents`, which passes `(index, data, getContext())`.
  So any payload field has to be forwarded explicitly at each level, or it is lost.
- `BlockNode.#initialize` → `createDataNode` queues each `DataNodeAddedEvent` in a `queueMicrotask`. By the time it reaches `EditorJSModel`, the context stack has been popped, so its `userId` is `undefined`. Core's undo manager therefore never records these events. That is correct for undo, because the preceding `BlockAddedEvent` already carries the block's full serialized data. Recording both would make redo re-create data nodes that already exist and throw `AlreadyExistingKeyError`.

`collaboration-manager` has its own undo manager, which takes over `core:undo`/`core:redo` when it is registered. It is out of scope here (see Non-Goals).

## Goals / Non-Goals

**Goals:**
- `api.document.group(fn)`: synchronous, returns `fn`'s result, re-throws its error, and nested calls join the outer group.
- All local changes made inside a group are one undo step, kept separate from the steps before and after it.
- The group id is captured when an event is created, so it is correct even for events dispatched in a microtask.
- Undo and redo of a group work without errors, including groups that add blocks.
- Ungrouped behaviour is unchanged.

**Non-Goals:**
- Grouping in `collaboration-manager`'s undo manager. Grouped actions still undo in several steps when collaboration is enabled. That manager can later adopt the same batching rule using `groupId`.
- Fixing `userId` loss for microtask-dispatched events, or making the exclusion of block-construction `DataNodeAddedEvent`s explicit. The current behaviour is pinned by a test.
- Asynchronous groups (an `fn` that returns a promise, or changes made after an `await`).
- Sending `groupId` to the OT server or including it in serialized operations.

## Decisions

### D1. Batching by id, driven only by events (no open/close signal)

`#canAddToBatch(payload)` gains one rule, checked before the existing ones:

```
if (payload.groupId !== undefined || lastEvent.groupId !== undefined) {
  return payload.groupId === lastEvent.groupId;
}
// …existing text-continuation rule, unchanged
```

With this rule:

- **Earlier typing is closed off.** The group's first event has an id the open, ungrouped batch doesn't have, so the batch is moved to the stack.
- **Later typing is closed off.** The first ungrouped event after the group doesn't match, so the group's batch is moved to the stack.
- **Consecutive groups stay separate**, because their ids differ.

The debounce is unchanged. A group's events are all dispatched synchronously, plus any microtasks that follow immediately, so they fit well inside the 500 ms window.

*Alternative considered:* `DocumentAPI.group` calls `UndoRedoManager.beginGroup()`/`endGroup()` around `fn`. This was rejected for three reasons:
- It couples the API layer to the undo implementation.
- It would bypass `collaboration-manager`, which can't see those calls but can see event payloads.
- It still needs the id to place microtask events correctly.

With the event-driven rule, `UndoRedoManager` needs no new public API.

### D2. A separate group stack in `utils/Context.ts`

Add `runInGroup(fn)` and `getGroupId()`, backed by a second module-level stack, alongside the existing `userId` stack:

- `runInGroup` pushes a new id when the stack is empty, and pushes the current top when a group is already open, so nested calls reuse the outer id.
- It pops in `finally`, so a throw still closes the group.
- Ids come from a module-level counter (`'g1'`, `'g2'`, …). They only need to be unique within one JS realm for local undo. They are never serialized.

`EditorJSModel.group<T>(fn: () => T): T` wraps `runInGroup`. It is **not** decorated with `@WithContext`, because it takes no `userId`. The model calls inside `fn` still push their own `userId` as they do today.

*Alternative considered:* change the context value from `userId` to `{ userId, groupId }`. Rejected: it changes the meaning of every `getContext<string | number>()` call site and every `@WithContext` method, which is wider than necessary. A separate stack is an additive change.

### D3. Capture at creation, forward on re-dispatch

- `BaseDocumentEvent` and every concrete event constructor take an optional trailing `groupId?: string`, stored in `detail.groupId`.
- **Creation sites** (the 21 `getContext()` reads) also pass `getGroupId()`. `BlockNode.createDataNode` reads it **before** `queueMicrotask`, next to the existing `userId` capture.
- **Re-dispatch sites** pass `event.detail.groupId`, never `getGroupId()`. There are three:
  - `BlockNode` bubbling for text, value and tune events;
  - `EditorDocument.#listenAndBubbleBlockEvent`;
  - `EditorJSModel.#listenAndBubbleDocumentEvents`.
  The id always comes from where the event was created, never from where it is re-dispatched. This is what makes microtask events come out right.

`userId` handling at the re-dispatch sites is left unchanged (see the Non-Goals and R2).

### D4. `DocumentAPI.group` delegates to the model

The core `DocumentAPI` already holds `EditorJSModel`. `group(fn)` returns `this.#model.group(fn)`. The SDK interface gets the matching signature. No change to `EventBus`.

## Risks / Trade-offs

- **[R1] A group event arriving after the debounce flushed the batch starts a new step.** It would need a local, grouped event dispatched more than 500 ms after the group. Nothing produces that today, since microtasks run immediately. → Accepted. If async groups are ever added, revisit with "append to the top step when its `groupId` matches".
- **[R2] Block-construction `DataNodeAddedEvent`s are kept out of undo only because they lose their `userId`.** If someone fixes `userId` forwarding in `EditorJSModel`, these events would start being recorded, and redo would throw. → The core spec scenario "Block construction events are not recorded separately" becomes a test that fails in that case. The test's comment will point to the proper fix: skip events for data that a `BlockAdded` in the same step already covers.
- **[R3] 21 creation sites plus 3 re-dispatch sites to update.** A missed creation site silently produces `groupId: undefined` in the middle of a group, which would split the step. → An integration test runs a group covering every kind of mutation (text insert/remove/format, value modify, data node add/remove, block add/remove, tune modify) and asserts that every dispatched event carries the group's id.
- **[R4] Collaboration users don't get grouping.** → Documented in the proposal. `groupId` is on the event, so extending `collaboration-manager` later is a contained change.
- **[R5] A module-level group stack is shared by all model instances in one realm.** It behaves the same way as the existing `userId` stack. Group ids stay unique because the counter is global, and nesting across instances within one synchronous call is harmless. → Accepted.

## Migration Plan

Additive only. `groupId` is optional on events, constructors take it as an optional last argument, and `DocumentAPI.group` is a new method. Third-party `DocumentAPI` implementations, if any exist, would need to add `group`. Rollback is reverting the change; no data or format migration is involved.

## Open Questions

- Should `group` be available through `api.document` only, or also through `BlocksAPI` helpers such as `split` (i.e. should `split` group itself)? This design keeps it on `api.document` only. The paste change will wrap its whole sequence of calls in one `group`.
