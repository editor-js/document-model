## MODIFIED Requirements

### Requirement: EditorAPI surface
The system SHALL expose an `EditorAPI` aggregating `BlocksAPI` (insert/insertMany/delete/move/render/clear/getBlocksCount/split/convert/merge), `SelectionAPI` (applyInlineTool, selectedBlocks), `DocumentAPI` (serialized data, onUpdate, insertData/removeData/modifyData, undo/redo), and `TextAPI` (insert/remove/format/unformat/getFragments/get) to tools, plugins, and adapters.

#### Scenario: Deleting with no block selected
- **GIVEN** no block is currently selected/no caret is set
- **WHEN** `BlocksAPI.delete()` or `move()` is called without an explicit index
- **THEN** it throws an error ("No block selected to delete" / "No block selected to move")

#### Scenario: Splitting or converting with an unknown tool
- **GIVEN** a `splitBlock`/`convertBlock` call references a `dataKey` that doesn't exist, or a source/target tool that isn't registered
- **WHEN** the operation is attempted
- **THEN** it throws an error identifying the missing key or tool

Implemented in `src/api/index.ts`, `src/api/BlocksAPI.ts`, `src/api/SelectionAPI.ts`, `src/api/DocumentAPI/DocumentAPI.ts`, `src/api/TextAPI.ts`, `src/components/BlockManager.ts`, validated by co-located `.spec.ts`/`.integration.spec.ts` files.

## ADDED Requirements

### Requirement: Block merging
The system SHALL provide `BlocksManager.mergeBlocks()`, exposed as `BlocksAPI.merge()`, accepting either `{ block, userId? }` or `{ index, userId? }`:

- `{ block }` SHALL merge the given block into the block immediately before it.
- `{ index }` SHALL accept a text `Index` that starts in one block and ends in a later block; it SHALL remove the content inside the range, remove every block strictly between the two, and merge the end block into the start block at the range start. `{ block }` SHALL behave exactly as `{ index }` over the empty range from the end of the previous block's last text input to the start of the given block's first text input.

Merging SHALL keep the first block with its id and tool and convert the second block into it: the second block's content selected by its tool's `conversionConfig.export` — the text input at that key path with its inline fragments when it is a key path, the export function's plain-string result when it is a function, or its first text input with its inline fragments when it is absent — SHALL be appended to the first block's text input at the junction (the last text input for `{ block }`, the range's start input for `{ index }`), and the second block SHALL be removed. Appended text SHALL NOT inherit formatting from the text before the junction. When the first block has no text content left, the first block SHALL be removed instead and the second block kept with its id and tool. A block without text inputs SHALL be unmergeable. A `conversionConfig.export` key path that does not resolve to a text input of the second block SHALL absorb nothing, the second block still being removed.

`merge()` SHALL return the junction `{ block, key, offset }` — the id of the surviving block, the data key and the offset where the merged content starts — and SHALL NOT move the caret. It SHALL throw, leaving the document unchanged, when `{ block }` does not resolve to a block or resolves to the first block, when `{ index }` is not a text index or does not start and end in different blocks, or when either block to be joined has no text inputs. Blocks without text inputs lying strictly between the edges of `{ index }` SHALL be removed and SHALL NOT make the call throw. All mutations of one call SHALL be dispatched synchronously.

#### Scenario: Merging a paragraph into the previous paragraph
- **GIVEN** two paragraphs "First" and "Second"
- **WHEN** `merge({ block: 1 })` is called
- **THEN** the document holds one paragraph "FirstSecond" with the first block's id, and the result is `{ block: <first id>, key: 'text', offset: 5 }`

#### Scenario: Merging blocks of different tools
- **GIVEN** a header "Title" followed by a paragraph "Body" containing a bold range, the paragraph's `conversionConfig.export` being `'text'`
- **WHEN** `merge({ block: <paragraph id> })` is called
- **THEN** the header's text becomes "TitleBody" with the bold range re-applied shifted by 5, the paragraph is removed, and the header keeps its tool

#### Scenario: Second block exports through a function
- **GIVEN** the second block's tool declares `conversionConfig.export` as a function
- **WHEN** the block is merged
- **THEN** the function's string result is appended without inline fragments

#### Scenario: Second block without conversion config
- **GIVEN** the second block's tool declares no `conversionConfig`
- **WHEN** the block is merged
- **THEN** its first text input, with its inline fragments, is appended and the merge does not throw

#### Scenario: Content outside the export is dropped
- **GIVEN** the second block has a second, non-empty text input that its export key path does not point to
- **WHEN** the block is merged
- **THEN** only the exported input is appended and the block is removed together with its other input

#### Scenario: Formatting before the junction does not spread
- **GIVEN** the first block's text input ends with an italic run
- **WHEN** an unformatted block is merged into it
- **THEN** the appended text carries no italic formatting

#### Scenario: Previous block is empty
- **GIVEN** an empty paragraph followed by a header "Title"
- **WHEN** `merge({ block: <header id> })` is called
- **THEN** the empty paragraph is removed, the header keeps its id, tool and text, and the result points at offset 0 of the header's text input

#### Scenario: Merged block is empty
- **GIVEN** a paragraph "First" followed by an empty paragraph
- **WHEN** `merge({ block: 1 })` is called
- **THEN** the empty paragraph is removed, the first paragraph is unchanged, and the result points at offset 5 of it

#### Scenario: Merging a range across two blocks
- **GIVEN** two paragraphs "Hello world" and "Foo bar" and an index from offset 5 of the first to offset 3 of the second
- **WHEN** `merge({ index })` is called
- **THEN** the document holds one paragraph "Hello bar" with the first block's id, and the result points at offset 5 of it

#### Scenario: Merging a range across several blocks
- **GIVEN** an index starting in block 0 and ending in block 3, where block 2 has no text inputs
- **WHEN** `merge({ index })` is called
- **THEN** blocks 1 and 2 are removed and block 3's remaining content is merged into block 0

#### Scenario: Range starting at the beginning of the first block
- **GIVEN** a paragraph "Hello" followed by a header "World" and an index from offset 0 of the paragraph to offset 2 of the header
- **WHEN** `merge({ index })` is called
- **THEN** the paragraph is removed, the header keeps its id and tool with text "rld", and the result points at offset 0 of the header

#### Scenario: Invalid merge arguments
- **GIVEN** `{ block }` resolves to no block or to the first block, or `{ index }` is not a text index or starts and ends in the same block
- **WHEN** `merge()` is called
- **THEN** it throws an error describing the problem and the document is unchanged

#### Scenario: Merging does not move the caret
- **GIVEN** the user's caret is in another block
- **WHEN** `merge()` is called
- **THEN** the caret is not updated by the merge

#### Scenario: Merging next to a block without text inputs
- **GIVEN** a block without text inputs (e.g. an image) followed by a paragraph
- **WHEN** `merge({ block: <paragraph id> })` is called
- **THEN** it throws an error stating the previous block cannot be merged, and both blocks are unchanged

#### Scenario: Export key path that does not resolve
- **GIVEN** the second block's `conversionConfig.export` is a key path that matches none of its text inputs
- **WHEN** the block is merged
- **THEN** nothing is appended to the first block and the second block is removed

Implemented in `src/components/BlockManager.ts`, `src/api/BlocksAPI.ts`, validated by co-located `.spec.ts`/`.integration.spec.ts` files.
