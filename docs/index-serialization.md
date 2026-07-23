# Index Serialization Format

`IndexBase.serialize()` produces a compact JSON string. `Index.parse(serialized)` is the inverse.
`PartialIndex` cannot be serialized — it must be resolved to a concrete type first.

All formats share a `k` discriminant field that identifies the index kind.
All fields that can be omitted (`id`) are absent from the JSON when `undefined` — they are never written as `null`.

---

## `DocumentIndex` — `k: "doc"`

```json
{ "k": "doc", "id": "<documentId>" }
```

| Field | Type   | Required |
|-------|--------|----------|
| `k`   | `"doc"` | yes |
| `id`  | string  | yes |

---

## `PropertyIndex` — `k: "prop"`

```json
{ "k": "prop", "name": "<propertyName>", "id": "<documentId>" }
```

| Field  | Type     | Required |
|--------|----------|----------|
| `k`    | `"prop"` | yes |
| `name` | string   | yes |
| `id`   | string   | no  |

---

## `BlockIndex` — `k: "block"`

```json
{ "k": "block", "b": 2, "id": "<documentId>" }
```

| Field | Type      | Required |
|-------|-----------|----------|
| `k`   | `"block"` | yes |
| `b`   | number    | yes — zero-based block position |
| `id`  | string    | no  |

---

## `DataIndex` — `k: "data"`

```json
{ "k": "data", "b": 2, "data": "<dataKey>", "id": "<documentId>" }
```

| Field  | Type     | Required |
|--------|----------|----------|
| `k`    | `"data"` | yes |
| `b`    | number   | yes — zero-based block position |
| `data` | string   | yes — data key within the block |
| `id`   | string   | no  |

---

## `TuneIndex` — `k: "tune"`

```json
{ "k": "tune", "b": 2, "tune": "<tuneName>", "key": "<tuneKey>", "id": "<documentId>" }
```

| Field  | Type     | Required |
|--------|----------|----------|
| `k`    | `"tune"` | yes |
| `b`    | number   | yes — zero-based block position |
| `tune` | string   | yes — block tune name |
| `key`  | string   | yes — key within the tune |
| `id`   | string   | no  |

---

## `TextIndex` (single segment) — `k: "text"`

A `TextIndex` with exactly one segment serializes as a flat `text` object.

```json
{ "k": "text", "b": 2, "data": "<dataKey>", "r": [4, 9], "id": "<documentId>" }
```

| Field  | Type     | Required |
|--------|----------|----------|
| `k`    | `"text"` | yes |
| `b`    | number   | yes — zero-based block position |
| `data` | string   | yes — data key of the text property |
| `r`    | [number, number] | yes — `[start, end]` character offsets |
| `id`   | string   | no  |

---

## `TextIndex` (composite) — `k: "composite"`

A `TextIndex` with more than one segment serializes as a `composite` object with a `segs` array.
Each element of `segs` has the same shape as the single-segment `text` format minus the `k` field.

```json
{
  "k": "composite",
  "segs": [
    { "b": 0, "data": "text", "r": [0, 3] },
    { "b": 1, "data": "text", "r": [5, 9], "id": "<documentId>" }
  ]
}
```

| Field       | Type     | Required |
|-------------|----------|----------|
| `k`         | `"composite"` | yes |
| `segs`      | array    | yes — one or more segment objects |
| `segs[].b`  | number   | yes — zero-based block position |
| `segs[].data` | string | yes — data key |
| `segs[].r`  | [number, number] | yes — `[start, end]` character offsets |
| `segs[].id` | string   | no  |

---

## Full examples

### Caret inside the first paragraph's text field

A user's caret sits between characters 3 and 3 (collapsed) in the `text` data key of the block at position 0, inside document `"doc-abc"`.

```ts
Index.text([{ blockIndex: 0, dataKey: 'text', textRange: [3, 3], documentId: 'doc-abc' }])
  .serialize()
// → '{"k":"text","b":0,"data":"text","r":[3,3],"id":"doc-abc"}'
```

### Selected word across a single block

Characters 4–9 selected in the second block's `text` field. No `documentId` (single-document context).

```ts
Index.text([{ blockIndex: 1, dataKey: 'text', textRange: [4, 9] }])
  .serialize()
// → '{"k":"text","b":1,"data":"text","r":[4,9]}'
```

### Cross-block selection (composite)

A drag selection that starts in block 0 (`textRange: [6, 12]`) and ends in block 1 (`textRange: [0, 4]`). Produces a `composite` with two segments.

```ts
Index.fromCompositeSegments([
  Index.text([{ blockIndex: 0, dataKey: 'text', textRange: [6, 12] }]),
  Index.text([{ blockIndex: 1, dataKey: 'text', textRange: [0, 4] }]),
]).serialize()
// → '{"k":"composite","segs":[{"b":0,"data":"text","r":[6,12]},{"b":1,"data":"text","r":[0,4]}]}'
```

### Block-scoped OT operation target

An operation that targets the entire third block (e.g. block removal).

```ts
Index.block(2, 'doc-abc').serialize()
// → '{"k":"block","b":2,"id":"doc-abc"}'
```

### Tune property change

A `fontSize` tune on block 1, key `"size"` changed.

```ts
Index.tune(1, 'fontSize', 'size').serialize()
// → '{"k":"tune","b":1,"tune":"fontSize","key":"size"}'
```

### Round-trip through `Index.parse`

```ts
const serialized = Index.block(0, 'doc-abc').serialize();
// '{"k":"block","b":0,"id":"doc-abc"}'

const restored = Index.parse(serialized) as BlockIndex;
restored.blockIndex; // 0
restored.documentId; // 'doc-abc'
restored.kind;       // IndexKind.Block
```

---

## Rules

- **Round-trip**: `Index.parse(index.serialize())` produces an equal index for all concrete types.
- **`k` is mandatory**: `Index.parse` throws `"Invalid serialized index"` if the input is not a JSON object with a string `k` field, and `"Unknown index kind: <k>"` for unrecognised values.
- **`PartialIndex` throws**: calling `serialize()` on a `PartialIndex` always throws — resolve it first via `withBlockIndex().withDocumentId().resolve()`.
- **Field names are abbreviated** (`b`, `r`, `k`, `id`) to keep serialized strings compact.
