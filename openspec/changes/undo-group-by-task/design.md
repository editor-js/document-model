## Context

Core's `UndoRedoManager` (`packages/core/src/components/UndoRedoManager.ts`) listens to `EventType.Changed` on `EditorJSModel`.

- **Which events it records.** It ignores remote events (where `detail.userId` isn't the local user) and the events it causes itself while replaying an undo or redo (`#isApplying`).
- **How events become steps.** Recorded events are collected into `#batch`. The batch becomes an undo step (is pushed onto `#undoStack`) either after 500 ms without new events, or when `#canAddToBatch` rejects the next event. `#canAddToBatch` only accepts a text insert or removal that directly continues the previous one in the same `blockIndex`/`dataKey`.
- **A step is already a list of events.** `undo()` and `redo()` replay the whole list, so grouping only depends on where steps are cut.

Every user action in the editor runs synchronously inside one browser task: a keydown or `beforeinput` handler, a `paste` handler, a toolbar click. The model changes it causes are dispatched synchronously within that task. The only deferred events are the `DataNodeAddedEvent`s that `BlockNode` queues with `queueMicrotask` during construction, and microtasks still run before the task's end callback (`setTimeout(0)`). Those events reach the manager without a `userId` (the re-wrap in `EditorJSModel` reads `getContext()` after it has been popped), so they are not recorded today. That is correct, because `BlockAdded` already carries the block's data.

`BlockManager.splitBlock` in the middle of a text emits `TextRemoved`, then `BlockAdded`. With today's rule that is two undo steps for one Enter.

## Goals / Non-Goals

**Goals:**
- A user action that makes several model changes in one task undoes and redoes as one step.
- Typing keeps today's batching exactly.
- A multi-change action is always kept separate from typing that comes before it.
- No public API, no event-payload change, no change outside `UndoRedoManager`.

**Non-Goals:**
- **Grouping across tasks.** Async actions, such as a file paste that waits for an upload, can't be grouped this way.
- **Grouping in `collaboration-manager`'s undo manager.**
- **Fixing `userId` loss for microtask-dispatched events.**

## Decisions

### D1. Buffer the current task, decide when it ends

```
local event ─▶ #taskEvents.push(e)
               └─ first event of the task? → #taskTimer = setTimeout(#closeTask, 0)

#closeTask():
  events = #taskEvents; #taskEvents = []
  events.length === 1 → existing path: #canAddToBatch(e) ? #batch.push(e)
                                        : (#putBatchToUndo(); #batch = [e])
  events.length  >  1 → #putBatchToUndo(); #batch = events
  #debounce()
```

When the first event arrives, the manager can't yet know whether the task will produce more events. So it waits until the task ends before deciding.

`#redoStack` is still cleared as soon as a local event arrives, exactly as today.

### D2. A multi-change step can be continued, but never merges backwards

When a multi-change task ends, it always closes the open batch: earlier typing is never merged into it. Its events then become the open batch. A later single-event task may continue that batch, but only through the existing text rule, which compares against the batch's **last** event.

- After a block-level action (paste of blocks, Enter, conversion) the last event is a block or data event. The text rule never matches those, so the next typing starts a new step.
- After typing over a selection (one task: `TextRemoved` then `TextAdded`), the next keystrokes continue the `TextAdded`. "Replace selection and keep typing" therefore undoes as one step, restoring the selected text. That is how text editors usually behave.

*Alternative considered: seal multi-change steps so that nothing is ever merged into them afterwards.* Rejected. Typing over a selection would undo as "the first character plus the restored selection", and then the rest of the word as a separate step. That is worse than today.

### D3. The end of a task is detected with `setTimeout(0)`

- It runs after the current task and all of its microtasks.
- It works the same in every browser and in Node.
- Jest's fake timers control it.

*Alternative considered: `MessageChannel`, which fires sooner.* Not needed: the extra delay is invisible to users, because undo first records the buffered events (D4). `MessageChannel` is also harder to fake in tests.

### D4. Record buffered events before undo, redo and destroy

- `undo()` and `redo()` call `#closeTask()` before `#putBatchToUndo()`. `#closeTask()` cancels `#taskTimer` and records the buffered events.
- `destroy()` cancels `#taskTimer` as well as the debounce timer.

`undo()` is normally triggered from a later keydown task, so in practice the buffer is already empty. Recording it first covers programmatic `api.document.undo()` called in the same task as the changes.

## Alternatives (whole-approach)

- **Explicit `api.document.group(fn)` with a `groupId` on model events.** This was the first draft of this change. Rejected for now:
  - It adds public API and requires every tool and plugin author to remember to use it.
  - It needs `groupId` on events and changes at 24 places in the model.
  - It doesn't fix Enter unless `split` groups its own changes.

  It remains the answer if async actions ever need to be one step. It is compatible with this design, because an explicit group would just override task grouping.
- **Move multi-step actions into core methods that group internally.** Rejected: it would pull paste and other plugin logic back into the headless core.

## Risks / Trade-offs

- **[R1] Grouping is implicit.** Two unrelated programmatic changes made in the same task become one step, for example a plugin that edits on `core:ready` while the document is initialized. → Acceptable: it's rare, and one step is usually what's wanted. If it matters, it can be revisited with the explicit API.
- **[R2] Redo still depends on block-construction `DataNodeAddedEvent`s not being recorded.** If `userId` forwarding is ever fixed, they would land in the same task and redo would throw `AlreadyExistingKeyError`. → The spec scenario "Block construction events are not recorded separately" becomes an integration test that fails in that case. Its comment names the proper fix: skip data-node events that are covered by a `BlockAdded` in the same step.
- **[R3] Behaviour change for existing multi-change actions** (Enter, block conversion, inline formatting across inputs if it emits several events in one task). → Intended. The spec scenarios cover Enter, and the proposal states the change.
- **[R4] Timer-based tests.** Existing `UndoRedoManager` tests that dispatch events and immediately call `undo()` still pass, because `undo()` records the buffer first (D4). Tests that inspect batches between events must advance timers. → Use Jest fake timers consistently.
- **[R5] No grouping when collaboration is enabled.** → Documented. `collaboration-manager` can adopt the same per-task buffering later.

## Migration Plan

No API or data migration. Rollback is reverting `UndoRedoManager`.

## Open Questions

None.
