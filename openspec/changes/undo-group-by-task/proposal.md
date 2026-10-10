## Why

Core's `UndoRedoManager` only merges consecutive text inserts or removals in the same input (within a 500 ms debounce window) into one undo step. Any action that makes several different model changes becomes several undo steps:

- **Enter in the middle of a paragraph** is two steps today. `BlockManager.splitBlock` emits `TextRemoved` and then `BlockAdded`, and `#canAddToBatch` rejects that pair.
- **The upcoming paste** (`clipboard-paste-plain-and-editorjs`) removes the selected text, splits the block and inserts blocks. That would be three or more steps.

From the user's point of view, each of these is a single action. They all have one thing in common: the model changes happen synchronously while the browser handles one input event. Grouping changes by browser task fixes all of them in core, without asking tools or plugins to mark their changes. It adds no public API, no new event fields, and no changes to the model.

## What Changes

- **Group by task.** `UndoRedoManager` buffers the local model events of the current browser task and decides how to record them when the task ends. The task end is detected with `setTimeout(0)`, scheduled when the first event of the task arrives; microtasks, such as `BlockNode`'s deferred `DataNodeAddedEvent`s, run before it.
  - **One event in the task** (e.g. a keystroke): recorded exactly as today. It merges into the open step if the existing text-continuation rule allows, otherwise it starts a new step. Typing behaviour does not change.
  - **Several events in the task** (e.g. Enter split, paste, block conversion): the open step is closed, and the task's events start a new step together. Typing before the action therefore stays a separate step. Typing after a block-level action starts its own step, because the text rule never continues a block event.
- **`undo()` and `redo()` record the buffer first.** Before acting, they record any events still buffered for the current task, in the same way they already flush the open debounce batch.
- **`destroy()`** also cancels the pending task-end timer.
- **Behaviour change (not an API break):** actions that make several model changes in one task, which undo in several steps today, now undo in one. That is the intended effect.
- **Unchanged:** remote events are still ignored, events produced while undo/redo replays are still ignored, and the 500 ms debounce for typing stays.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `core`: the "Local undo/redo" requirement now groups the local changes of one browser task into one undo step. The new scenarios cover Enter, multi-change tasks around typing, and undo while events are still buffered.

## Impact

- **Code:** `packages/core/src/components/UndoRedoManager.ts` and its `.spec.ts`, plus one integration test through `Core`. No other package changes, and no public API changes.
- **Collaboration:** `collaboration-manager` keeps its own undo manager, which takes over `core:undo`/`core:redo` when it is registered. That manager is not changed here, so multi-change actions still undo in several steps when collaboration is enabled. It can adopt the same per-task rule later, without any new event fields.
- **Not covered:** asynchronous actions, such as a file paste that waits for an upload, which span several tasks and cannot be grouped this way. If they ever need to be one step, an explicit `api.document.group(fn)` can be added then (see `design.md`, "Alternatives").
- **Docs:** `docs/diagrams/undo-redo-flow.mmd` (core grouping by task), `docs/collaboration.md` (note that collaboration undo does not group by task yet). Nothing in `docs/` is superseded.
- **Follow-up:** `clipboard-paste-plain-and-editorjs` relies on this behaviour for "a paste is one undo step". It needs no API from this change.
