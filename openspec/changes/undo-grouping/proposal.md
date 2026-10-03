## Why

Core's `UndoRedoManager` only groups consecutive text inserts or removals in the same input, within a 500 ms debounce window. Any action that makes several kinds of model change becomes several undo steps. A paste, for example, removes the selected text, splits the block, and inserts blocks. The upcoming paste change (`clipboard-paste-plain-and-editorjs`) needs a whole paste to undo with one Ctrl+Z. Cut, drop and block conversion will need the same, so it belongs in core as a general primitive, not inside the paste code.

## What Changes

- Add `api.document.group(fn)` to the SDK `DocumentAPI` contract and implement it in core. Model changes made synchronously inside `fn` by the local user form exactly one undo step:
  - Any in-progress debounce batch is closed before the group opens, so earlier typing stays a separate step.
  - The group's step is closed when `fn` returns, so later typing starts a new step.
  - Nested `group()` calls join the outermost group.
  - If `fn` throws, the group still closes and the error is re-thrown.
- The model carries a **group id** on every document event. It is captured synchronously when the event is created and kept as the event bubbles up the model tree (`BlockNode` → `EditorDocument` → `EditorJSModel`). This includes events dispatched later in a microtask, such as the `DataNodeAddedEvent`s `BlockNode` emits during construction.
- `EditorJSModel` gets a way to run a function inside a group context (a new group id, or the enclosing one when nested).
- `EventPayloadBase` gains an optional `groupId` field. The change is additive; events created outside a group leave it `undefined`.
- `UndoRedoManager` groups by id. A local event carrying a group id joins the current batch only if the batch has the same group id. Otherwise the batch is closed and a new one starts. An event without a group id never joins a grouped batch. Ungrouped events keep today's batching exactly. As a result, the group's step is closed before and after the group with no extra signals between core and the model.
- Record one fact the change depends on: `DataNodeAddedEvent`s that `BlockNode` fires in a microtask while it is being constructed reach `EditorJSModel` with no `userId`, because the re-wrap reads `getContext()` after the context has been popped. Core's `UndoRedoManager` therefore never records them. This is correct for undo: the preceding `BlockAddedEvent` already holds the block's data, and recording both would break redo with `AlreadyExistingKeyError`. This change adds a test that pins the behaviour (a grouped block insert undoes and redoes cleanly) and records it in the design. Making the exclusion explicit, instead of a side effect of the missing `userId`, is left for later.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `core`: "Local undo/redo" batches by group id: a group's events form one step, closed off from the changes before and after it. "EditorAPI surface" lists `DocumentAPI.group`.
- `sdk`: new requirement "Grouped document changes" for the `group(fn)` contract on `DocumentAPI`.
- `model`: new requirement "Grouped mutations": `EditorJSModel` can run a function inside a group context, and document events carry the group id that was active when they were created, including events dispatched in a microtask, and keep it while bubbling.
- `model-types`: "Base document event and event bus" adds the optional `groupId` field to `EventPayloadBase` and the `BaseDocumentEvent` constructor.

## Impact

- **Packages**:
  - `model-types`: event payload and base event.
  - `model`: the context utilities in `utils/Context.ts`, every event-creation site that reads `getContext()` (21 sites), and the bubbling re-wraps in `BlockNode`, `EditorDocument` and `EditorJSModel`.
  - `sdk`: the `DocumentAPI` interface.
  - `core`: `DocumentAPI` and `UndoRedoManager`. `UndoRedoManager` only changes its batching rule; no new calls from `DocumentAPI` into it.
- **API**: additive only. There are no **BREAKING** changes. Events without a group behave as they do today.
- **Collaboration**: `collaboration-manager` keeps its own `UndoRedoManager`, which takes over `core:undo`/`core:redo` when it is registered (see the `architecture` spec). That manager does not read `groupId` in this change, so a grouped action still undoes in several steps when collaboration is enabled. Because the group id is now on every event, supporting it there later only needs a change to that manager. The OT server and operation serialization are unaffected; `groupId` is not sent over the wire.
- **Docs**:
  - `docs/diagrams/undo-redo-flow.mmd` and `docs/events.md` (the `BaseDocumentEvent` payload fields) need to show the group id and grouping.
  - Nothing in `docs/` is replaced by this change.
- **Follow-up**: `clipboard-paste-plain-and-editorjs` depends on this change.
