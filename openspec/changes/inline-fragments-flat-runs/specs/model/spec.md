## REMOVED Requirements

### Requirement: Inline text tree
**Reason**: The inline formatting tree (`ParentInlineNode` / `FormattingInlineNode` / `TextInlineNode`) is not canonical: its shape, and the fragments derived from it, depend on the order formatting was applied in (#53). It is replaced by a flat run representation inside `TextNode`.
**Migration**: Use `TextNode` only. Its public API (`insertText`, `removeText`, `getText`, `format`, `unformat`, `getFragments`, `serialized`, `length`), events and serialized format are unchanged. `format`/`unformat` now return `void`; the tree node classes and the `ParentNode`/`ChildNode` mixins are no longer exported.

## ADDED Requirements

### Requirement: Inline formatted text
The system SHALL provide `TextNode` as the container of a text data node's value and inline formatting. It SHALL support inserting and removing text, reading text, applying (`format`) and removing (`unformat`) an inline tool over a character range, and listing inline fragments. Indices and ranges SHALL be validated against the current text length, and a range's end SHALL NOT be lower than its start. `insertText`, `removeText`, `format` and `unformat` SHALL dispatch `TextAddedEvent`, `TextRemovedEvent`, `TextFormattedEvent` and `TextUnformattedEvent` respectively, with the affected text range and the current context user. `serialized` SHALL return the text value and the fragments as returned by `getFragments()`. `TextNode` SHALL keep its own copy of the data passed to `format` and SHALL return copies of it in fragments, so changes to those objects don't change its state.

Implemented in `src/entities/inline-text/TextNode/index.ts`, validated by its co-located `.spec.ts`.

#### Scenario: Inserting text into an empty text node
- **GIVEN** a `TextNode` with no text
- **WHEN** `insertText('abc')` is called
- **THEN** `getText()` returns `abc`, `getFragments()` returns no fragments and a `TextAddedEvent` with text range `[0, 0]` is dispatched

#### Scenario: Removing text with an out-of-range index
- **GIVEN** a `TextNode` with text `abc`
- **WHEN** `removeText(0, 5)` is called
- **THEN** it throws a range validation error and the text is unchanged

#### Scenario: Formatting with an inverted range
- **GIVEN** a `TextNode` with text `abcd`
- **WHEN** `format('bold', 3, 1)` is called
- **THEN** it throws a range validation error

#### Scenario: Removing text inside formatting
- **GIVEN** a `TextNode` with text `abcdef` formatted with bold over `[1, 5]`
- **WHEN** `removeText(2, 4)` is called
- **THEN** `removeText` returns `cd`, `getText()` returns `abef` and `getFragments()` returns bold over `[1, 3]`

#### Scenario: Mutating data after formatting
- **GIVEN** a `TextNode` with text `abcd` formatted with link over `[0, 4]` using a data object `{ href: 'a' }`
- **WHEN** that object's `href` is changed to `b`, or the `data` of a fragment returned by `getFragments()` is changed
- **THEN** `getFragments()` still returns link `[0, 4]` with `{ href: 'a' }`

#### Scenario: Removing all formatted text drops the fragment
- **GIVEN** a `TextNode` with text `abcd` formatted with bold over `[1, 3]`
- **WHEN** `removeText(1, 3)` is called
- **THEN** `getFragments()` returns no fragments

### Requirement: Canonical inline formatting state
The formatting state of a `TextNode`, and so its fragments, SHALL depend only on which inline tool (with which data) applies to each character, never on the order or the way `format`, `unformat` and text operations were performed, nor on the order of fragments passed to the constructor. Each character SHALL carry at most one mark per inline tool. Empty data (`{}`) SHALL be treated as no data and returned without a `data` key, so equal data can't produce different output. Fragments passed to the constructor SHALL be applied sorted by range start ascending, range end descending, tool name, then data, so where fragments of the same tool overlap with different data, the one that sorts later wins whatever order they were passed in.

#### Scenario: Same formatting applied in a different order
- **GIVEN** two `TextNode`s with text `abcd`
- **WHEN** the first gets bold `[0, 2]`, italic `[0, 4]`, bold `[2, 4]` and the second gets bold `[0, 4]`, italic `[0, 4]`
- **THEN** both return the same fragments: bold `[0, 4]`, italic `[0, 4]`

#### Scenario: Loading the same fragments in a different order
- **GIVEN** fragments bold `[0, 3]` and italic `[1, 5]` for text `abcdef`
- **WHEN** one `TextNode` is constructed with them in that order and another with them reversed
- **THEN** both return the same fragments in the same order

#### Scenario: Empty data is the same as no data
- **GIVEN** two `TextNode`s with text `abcd`
- **WHEN** the first gets bold `[0, 2]` with data `{}` and bold `[2, 4]` without data, and the second gets the same with the data swapped
- **THEN** both return a single bold fragment over `[0, 4]` without a `data` key

#### Scenario: Loading conflicting fragments in a different order
- **GIVEN** fragments link `[0, 4]` with `{ href: 'a' }` and link `[2, 6]` with `{ href: 'b' }` for text `abcdef`
- **WHEN** one `TextNode` is constructed with them in that order and another with them reversed
- **THEN** both return link `[0, 2]` with `{ href: 'a' }` and link `[2, 6]` with `{ href: 'b' }`

#### Scenario: Unformatting restores the previous state
- **GIVEN** a `TextNode` with text `abcd` formatted with bold `[0, 4]`
- **WHEN** italic is applied over `[1, 3]` and then removed over `[1, 3]`
- **THEN** `getFragments()` returns only bold `[0, 4]`

### Requirement: Maximal inline fragments
`getFragments()` SHALL return one fragment per maximal stretch of characters formatted with the same tool and equal data. Adjacent or overlapping stretches of the same tool with equal data SHALL be returned as a single fragment; stretches of the same tool whose data differs SHALL be returned as separate fragments. Data equality SHALL default to a deep structural comparison, which an inline tool MAY override with its own comparator.

#### Scenario: Fragments split by other formatting are merged
- **GIVEN** a `TextNode` with text `abcdef`
- **WHEN** bold `[0, 3]`, italic `[1, 3]`, italic `[3, 6]` and bold `[3, 5]` are applied in that order
- **THEN** `getFragments()` returns bold `[0, 5]` and italic `[1, 6]`

#### Scenario: Adjacent formatting with equal data is merged
- **GIVEN** a `TextNode` with text `abcd`
- **WHEN** link `{ href: 'a' }` is applied over `[0, 2]` and then over `[2, 4]`
- **THEN** `getFragments()` returns a single link fragment over `[0, 4]` with data `{ href: 'a' }`

#### Scenario: Adjacent formatting with different data is kept separate
- **GIVEN** a `TextNode` with text `abcd`
- **WHEN** link `{ href: 'a' }` is applied over `[0, 2]` and link `{ href: 'b' }` over `[2, 4]`
- **THEN** `getFragments()` returns link `[0, 2]` with `{ href: 'a' }` and link `[2, 4]` with `{ href: 'b' }`

#### Scenario: Removing text joins equal fragments
- **GIVEN** a `TextNode` with text `abcdef`, bold `[0, 2]`, italic `[2, 4]` and bold `[4, 6]`
- **WHEN** `removeText(2, 4)` is called
- **THEN** `getFragments()` returns a single bold fragment over `[0, 4]`

### Requirement: Re-applying an inline tool
When an inline tool is applied over a range where some characters already carry that tool, the system SHALL replace the existing data with the newly supplied data on the affected characters only. When the supplied data is equal to the existing data (under the effective comparator), the formatting state SHALL be left unchanged.

#### Scenario: Re-applying the same tool with different data
- **GIVEN** a `TextNode` with text `abcd` formatted with link `{ href: 'a' }` over `[0, 4]`
- **WHEN** link `{ href: 'b' }` is applied over `[1, 3]`
- **THEN** `getFragments()` returns link `[0, 1]` with `{ href: 'a' }`, link `[1, 3]` with `{ href: 'b' }` and link `[3, 4]` with `{ href: 'a' }`

#### Scenario: Re-applying the same tool with identical data
- **GIVEN** a `TextNode` with text `abcd` formatted with link `{ href: 'a' }` over `[0, 4]`
- **WHEN** link `{ href: 'a' }` is applied over `[1, 3]`
- **THEN** `getFragments()` still returns a single link fragment over `[0, 4]`

### Requirement: Deterministic inline fragment order
`getFragments()` SHALL return fragments sorted by range start ascending, then range end descending, then tool name ascending, so that fragments which contain others come first.

#### Scenario: Containing fragment comes first
- **GIVEN** a `TextNode` with text `abcd`
- **WHEN** italic `[1, 3]` is applied and then bold `[0, 4]`
- **THEN** `getFragments()` returns bold `[0, 4]` before italic `[1, 3]`

#### Scenario: Equal ranges are ordered by tool name
- **GIVEN** a `TextNode` with text `abcd`
- **WHEN** italic `[0, 4]` is applied and then bold `[0, 4]`
- **THEN** `getFragments()` returns bold `[0, 4]` before italic `[0, 4]`

### Requirement: Inline fragments in a range
`getFragments(start, end, tool?)` SHALL return the whole fragments (with their full ranges) that share at least one character with `[start, end)`, in the same order as `getFragments()`. Fragments that only touch the range boundary SHALL NOT be returned, and an empty range SHALL return no fragments. When `tool` is passed, only fragments of that tool SHALL be returned.

#### Scenario: Partially covered fragment is returned whole
- **GIVEN** a `TextNode` with text `abcdef` formatted with bold `[1, 5]`
- **WHEN** `getFragments(0, 2)` is called
- **THEN** it returns bold `[1, 5]`

#### Scenario: Touching fragment is not returned
- **GIVEN** a `TextNode` with text `abcdef` formatted with bold `[0, 2]` and italic `[4, 6]`
- **WHEN** `getFragments(2, 4)` is called
- **THEN** it returns no fragments

#### Scenario: Filtering by tool
- **GIVEN** a `TextNode` with text `abcd` formatted with bold `[0, 4]` and italic `[1, 3]`
- **WHEN** `getFragments(0, 4, 'italic')` is called
- **THEN** it returns only italic `[1, 3]`

### Requirement: Inserted text inherits formatting
Text inserted at index `i > 0` SHALL get the formatting of the character at `i - 1`. Text inserted at index `0` of a non-empty text SHALL get the formatting of the first character. Text inserted into an empty text SHALL have no formatting.

#### Scenario: Inserting at the end of a formatted stretch
- **GIVEN** a `TextNode` with text `abcd` formatted with bold `[0, 2]`
- **WHEN** `insertText('X', 2)` is called
- **THEN** `getFragments()` returns bold `[0, 3]`

#### Scenario: Inserting at the start of formatted text
- **GIVEN** a `TextNode` with text `abcd` formatted with bold `[0, 2]`
- **WHEN** `insertText('X', 0)` is called
- **THEN** `getFragments()` returns bold `[0, 3]`

#### Scenario: Inserting after unformatted text
- **GIVEN** a `TextNode` with text `abcd` formatted with bold `[2, 4]`
- **WHEN** `insertText('X', 2)` is called
- **THEN** `getFragments()` returns bold `[3, 5]`
