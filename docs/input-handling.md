# Input Handling

This page is the canonical typing and selection pipeline.

## Block adapter creation

When a block appears, `BlockRenderer` creates a per-block `BlockToolAdapter`.

The block tool registers DOM inputs through that adapter. Inputs are tracked inside adapter internals (`BlockToolAdapter` and `CaretAdapter`) for selection and rendering lookups.


→ [`diagrams/block-adapter-input-flow.mmd`](diagrams/block-adapter-input-flow.mmd)

_Block inserted → `BlockAddedEvent` → `BlockRenderer` creates adapter → tool attaches inputs. Typing then flows through events into model mutation and targeted DOM update._

## BeforeInput delegation

The `contenteditable` blocks holder is owned by `BlocksUI` (`@editorjs/ui`). It intercepts the browser `beforeinput` event, prevents its default, and re-dispatches it as `BeforeInputUIEvent` on the global `EventBus`. `DOMBlockToolAdapter` listens for this event and performs the actual model mutation (`insertText`, `removeText`, etc.).

## Caret & selection

`CaretAdapter` listens to browser `selectionchange`, scans attached inputs, and builds an `Index` in document coordinates.

That index is written to the model. `SelectionManager` reads it, resolves fragments/tools, and emits `SelectionChangedCoreEvent`.

On the return path, `CaretAdapter` restores DOM selection from the model index after re-renders, so caret state stays stable.


→ [`diagrams/caret-selection-flow.mmd`](diagrams/caret-selection-flow.mmd)

_Caret moved -> adapter builds `Index` -> model caret update -> tool availability computed -> UI event emitted -> DOM selection restored if needed._

## Inline formatting

When an inline tool is applied, `SelectionManager.applyInlineToolForCurrentSelection()` reads the current caret index, queries the model for existing fragments in the selection range, and calls `model.format()` or `model.unformat()` directly depending on whether the range is already formatted.

The model emits `TextFormattedEvent` / `TextUnformattedEvent`; `FormattingAdapter` listens to these events, re-renders only the affected DOM range, and then caret position is restored from the model index.


→ [`diagrams/inline-formatting-flow.mmd`](diagrams/inline-formatting-flow.mmd)

_Inline tool activation -> model format/unformat -> formatting event -> targeted DOM rerender -> caret restore._
