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
- No public API and no event-payload change. Outside `UndoRedoManager`, only the point where Core creates it changes (D6).

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

A **task** is one run of the browser's event loop: one input handler (keydown, `beforeinput`, `paste`, a click), everything it does synchronously, and the microtasks it queues. A 0 ms timer scheduled during the task can only run in a later task, so when it fires, the handler and all of its microtasks are done.

- It runs after the current task and all of its microtasks, including the `DataNodeAddedEvent`s that `BlockNode` queues during construction.
- It works the same in every browser and in Node.
- Jest's fake timers control it.

*Alternative considered: `queueMicrotask`.* Rejected. A microtask queued on the first event runs before microtasks queued later in the same task, such as `BlockNode`'s, so their events would fall outside the group. A handler that `await`s would also be split.

*Alternative considered: `requestAnimationFrame`.* Rejected. It doesn't run in background tabs, in Node, or in jsdom tests. It also waits for the next frame, so several input tasks would fall into one group.

*Alternative considered: `MessageChannel`, which fires sooner.* Not needed: the extra delay is invisible to users, because undo first records the buffered events (D4). `MessageChannel` is also harder to fake in tests.

**Known limitation.** The browser doesn't guarantee that the timer runs before the next input task. When the main thread is busy, two input tasks can run before the timer fires, so their events land in one buffer and are recorded as one task. For two keystrokes, that buffer holds two events, so they start a new step instead of continuing the open typing batch: a word may undo in two parts. A keystroke followed by Enter would undo as one step. This only changes where steps are cut, never which changes are recorded, and it needs a main thread that is busy for longer than one keystroke.

The implementation explains this in short JSDoc on `#closeTask()` and where the timer is scheduled: what a task is, why a 0 ms timer marks its end, why not `queueMicrotask` or `requestAnimationFrame`, and this limitation.

### D4. Record buffered events before undo, redo and destroy

- `undo()` and `redo()` call `#closeTask()` before `#putBatchToUndo()`. `#closeTask()` cancels `#taskTimer` and records the buffered events.
- `destroy()` cancels `#taskTimer` as well as the debounce timer.

`undo()` is normally triggered from a later keydown task, so in practice the buffer is already empty. Recording it first covers programmatic `api.document.undo()` called in the same task as the changes.

### D5. Re-applying block events passes a list of blocks

`BlockAddedEvent` and `BlockRemovedEvent` carry one serialized block in `detail.data`. `EditorDocument.insertData`/`removeData` take `BlockNodeInit[]` for a `BlockIndex` and iterate over it. When `#apply` handles an event whose index is a `BlockIndex`, it passes `[event.data]`. Text, data-node and property events are passed through unchanged.

*Alternative considered: let the model accept a single block.* Rejected for this change: it would touch the `model` package and its spec, whereas only the undo manager hands event data back to these methods. If another caller ever needs it, it can move into the model then.

### D6. Changes made by model listeners: order and grouping

Other `Changed` listeners on the model may react to a user's change by changing the model themselves. Core already has one: the integrator's `onModelUpdate` callback, which Core subscribes to the model in its constructor (`packages/core/src/index.ts`). Plugins and tools can subscribe too.

**The manager must be the model's first `Changed` listener.** A change made synchronously from a listener is dispatched while the outer event is still being handled. The nested event reaches every listener before the outer event reaches the listeners after the current one. Today `UndoRedoManager` is created in `initialize()`, after `onModelUpdate` is subscribed. So for a user change *A* that makes `onModelUpdate` apply change *B*, the manager records *B* before *A*, the reverse of the order the model applied them. Undo then reverts *A* first while *B* is still applied, and a change that depends on indexes (text offsets, block indexes) is reverted at the wrong position.

When the manager listens first, it records *A*, then the listener runs and the manager records *B*, so the recorded order matches the model's.

- Core creates `UndoRedoManager` in its constructor, right after the model is bound and before `onModelUpdate` is subscribed. The manager subscribes to the model in its own constructor, so it comes before `onModelUpdate` and before every plugin and tool.
- The `core:undo`/`core:redo` subscription stays where it is today, after plugins in `initialize()`, because the manager reads `defaultPrevented` set by plugin listeners. The manager gets a method for it that Core calls at that point.

*Alternative considered: subscribe `onModelUpdate` after the manager is created in `initialize()`.* Rejected. It fixes only `onModelUpdate`: plugins and tools are created before the manager and can subscribe to the model first, with the same problem.

*Alternative considered: reorder events inside the manager.* Not possible: events carry no sequence number, and the manager isn't on the call stack when the nested event arrives, so it can't tell a nested event from a new one.

**Grouping** follows when the listener's change runs:

- **Synchronously during dispatch, or in a microtask** (for example after `await`): it runs before the task-end timer, so it is buffered with the user's changes and undoes in the same step. That is usually what's wanted: a listener that normalizes the user's input is part of the same action.
- **In a later task** (a timer, an animation frame, a network response): it becomes a separate step, by the one-event and several-event rules. That includes a listener's `setTimeout(0)`: because the manager listens first, the task-end timer is always queued before it.

A listener's change never reaches the manager while a step is being recorded: `#closeTask()` and `#putBatchToUndo()` don't change the model, so they can't dispatch events.

### D7. The task timer and the debounce do different jobs

- **The task timer decides what goes into a step.** It is scheduled by a task's first local event and fires once that task and its microtasks are over.
- **The debounce decides when an open step is closed.** It restarts every time `#closeTask()` adds events to the batch, so a batch is recorded 500 ms after the last task that added to it.

The two can't fire in the middle of each other's work. Timers never run during synchronous code or microtasks, so the debounce can't close a batch while a task is still adding to the buffer. If the debounce fires while a task's events are still buffered (both timers were due in the same turn of the event loop), it records the open batch. The task's events then start a new batch when the task timer fires, as if the user had paused. `undo()`, `redo()` and `destroy()` handle both timers in a fixed order: the task buffer first, then the open batch (D4).

## Alternatives (whole-approach)

- **Explicit `api.document.group(fn)` with a `groupId` on model events.** This was the first draft of this change. Rejected for now:
  - It adds public API and requires every tool and plugin author to remember to use it.
  - It needs `groupId` on events and changes at 24 places in the model.
  - It doesn't fix Enter unless `split` groups its own changes.

  It remains the answer if async actions ever need to be one step. It is compatible with this design, because an explicit group would just override task grouping.
- **Move multi-step actions into core methods that group internally.** Rejected: it would pull paste and other plugin logic back into the headless core.

## Risks / Trade-offs

- **[R1] Grouping is implicit.** Two unrelated programmatic changes made in the same task become one step, for example a plugin that edits on `core:ready` while the document is initialized. → Acceptable: it's rare, and one step is usually what's wanted. If it matters, it can be revisited with the explicit API.
- **[R2] Undo and redo still depend on block-construction `DataNodeAddedEvent`s not being recorded.** Building a block queues one `DataNodeAddedEvent` per data key in a microtask, and today those events reach the manager without a `userId`. If `userId` forwarding is ever fixed, two paths break:
  - **Redo of a step that added a block:** the events land in the same task as `BlockAdded`, and redo throws `AlreadyExistingKeyError`.
  - **Undo of a step that removed a block:** `insertData` → `addBlock` queues the events, and they arrive after `#isApplying` is reset. They would be recorded as a new step, which clears the redo stack, so the undone removal can't be redone.

  → The spec scenario "Block construction events are not recorded separately" becomes integration tests that fail in either case. Their comments name the proper fixes: skip data-node events that are covered by a `BlockAdded` in the same step, and keep ignoring events until the microtasks queued while replaying have run.
- **[R3] Behaviour change for existing multi-change actions** (Enter, block conversion, inline formatting across inputs if it emits several events in one task). → Intended. The spec scenarios cover Enter, and the proposal states the change.
- **[R4] Existing tests that make several changes in one task.** Tests that dispatch one event and then call `undo()` still pass, because `undo()` records the buffer first (D4). Tests that make several changes synchronously and expect separate steps don't, because those changes are now one task:
  - unit tests such as "should NOT batch Added events at non-sequential positions" in `UndoRedoManager.spec.ts`;
  - the plugin-data tests in `UndoRedoManager.integration.spec.ts`, which call `updatePluginData` two or three times in one task and expect undo to revert only the last call. With task grouping, undo reverts all of them.

  → Those tests end the task (`endTask()`, which advances fake timers by 0 ms) between changes that stand for separate user actions. Several plugin-data writes in one task becoming one step is intended, and the spec states it.
- **[R5] No grouping when collaboration is enabled.** → Documented. `collaboration-manager` can adopt the same per-task buffering later.
- **[R6] Listeners that react to an undo or redo.** A model listener that changes the model in reaction to an undo or redo isn't handled well. If it does so synchronously, the manager ignores its change (`#isApplying`): the change isn't recorded and stays in the document after the next undo. If it does so in a later task, the change is recorded as a new step, which clears the redo stack. The same is true on `main` today, and task grouping doesn't change it. → Documented as a known limitation and covered by tests that pin the current behaviour. Fixing it (for example by recording listener changes made during replay into the replayed step) is a separate change, to be planned separately.

## Migration Plan

No API or data migration. Rollback is reverting `UndoRedoManager`.

## Open Questions

None.
