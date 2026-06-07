# Data Model

`EditorJSModel` is the source of truth. All document mutations go through it.

Internally it owns an `EditorDocument` (ordered `BlockNode[]`) and a `CaretManager` (one caret per `userId`).

## Document tree

Each `BlockNode` contains keyed data nodes:

- `TextNode`: rich text with inline tree (`FormattingInlineNode` + `TextInlineNode`).
- `ValueNode<T>`: non-text typed value for tools.
- `BlockTune`: per-block tune configuration.

## Mutation and event invariant

- Nodes dispatch internal change events when they mutate.
- `EditorJSModel` listens and re-dispatches a normalized stream for consumers.
- Consumers should subscribe to `EditorJSModel` events instead of listening to deep nodes.


→ [`diagrams/model-tree-structure.mmd`](diagrams/model-tree-structure.mmd)

_Node hierarchy. Document tree (left): `EditorJSModel` → `EditorDocument` → `BlockNode` → data nodes. Caret (right): `CaretManager` holds per-user `Caret` instances. All nodes extend `EventBus`._

## Caret & selection

`CaretManager` stores one `Caret` per collaborating user. Each `Caret` holds an `Index`: a serializable selection structure that can span blocks/data keys.

When a caret changes, `EditorJSModel` exposes that update under `EventType.CaretManagerUpdated` so the rest of the system can react without reading DOM state directly.

## Index

`Index` is the universal address type used throughout the system — for event locations, caret positions, and OT operation targets. It is DOM-independent and fully serializable.

| Field | Type | Meaning |
|---|---|---|
| `documentId` | `DocumentId?` | Which document the index belongs to |
| `blockIndex` | `number?` | Position of the block in `EditorDocument.children` |
| `dataKey` | `DataKey?` | Named data slot inside the block (e.g. `"text"`) |
| `textRange` | `[number, number]?` | Character-offset range `[start, end]` inside a `TextNode` |
| `tuneName` | `BlockTuneName?` | Identifies a `BlockTune` entry |
| `tuneKey` | `string?` | Key inside a tune's data object |
| `propertyName` | `string?` | Top-level document property |
| `compositeSegments` | `Index[]?` | For cross-input selections: one text index per covered input, in document order |

An index that has `blockIndex + dataKey + textRange` (and no `compositeSegments`) is a **text index** (`isTextIndex === true`). An index with only `blockIndex` is a **block index** (`isBlockIndex === true`).

Use `IndexBuilder` to construct indices incrementally, and `Index.parse(serialized)` / `index.serialize()` to round-trip through storage or the network.
