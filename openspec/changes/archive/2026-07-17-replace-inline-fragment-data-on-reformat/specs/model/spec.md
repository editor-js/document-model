## MODIFIED Requirements

### Requirement: Inline text tree
The system SHALL provide `TextNode` (extending `ParentInlineNode`) as the inline-fragment tree root for a text data node, supporting text insert/remove, format/unformat over ranges, fragment listing, and index/range validation with auto-merging/normalization of children. When a data-carrying inline tool is re-applied over a range already formatted with that same tool, the system SHALL replace the affected fragment's data with the newly supplied data instead of ignoring it. Two fragments of the same tool SHALL be considered equal (for normalization/merging) only when their data is also equal; data equality SHALL default to a deep structural comparison, which an inline tool MAY override with its own comparator.

#### Scenario: Inserting text into an empty tree
- **GIVEN** a `TextNode` with no children
- **WHEN** text is inserted
- **THEN** a child inline text node is auto-created and a `TextAddedEvent` is emitted

#### Scenario: Removing text with an out-of-range index
- **GIVEN** a `TextNode` with a bounded length
- **WHEN** `removeText` is called with indices outside that range
- **THEN** it throws a range/index validation error

#### Scenario: Overlapping formatting from the same or different tools
- **GIVEN** a text range that already has formatting applied
- **WHEN** `format` is applied again over an overlapping range (same tool or a different tool)
- **THEN** the resulting fragments nest or merge correctly without duplicating formatting

#### Scenario: Re-applying the same tool with different data
- **GIVEN** a fragment already formatted with a data-carrying tool (e.g. a `link` with `{ href: "a" }`)
- **WHEN** `format` is applied over that range with the same tool but different data (e.g. `{ href: "b" }`)
- **THEN** the fragment's data is replaced with the new data (`{ href: "b" }`) rather than the call being a no-op

#### Scenario: Re-applying the same tool with identical data
- **GIVEN** a fragment already formatted with a data-carrying tool
- **WHEN** `format` is applied over that range with the same tool and data that is equal under the effective comparator
- **THEN** the tree is left unchanged (no redundant fragments or mutations)

#### Scenario: Normalization keeps distinct-data fragments separate
- **GIVEN** two adjacent fragments of the same tool whose data differs
- **WHEN** the tree is normalized
- **THEN** the fragments are NOT merged, so each retains its own data

Implemented in `src/entities/inline-fragments/ParentInlineNode/index.ts`, `src/entities/inline-fragments/FormattingInlineNode/index.ts`, `src/entities/inline-fragments/TextNode/index.ts`, validated by `src/entities/inline-fragments/TextNode/*.spec.ts`, `src/entities/inline-fragments/FormattingInlineNode/*.spec.ts`, and `src/entities/inline-fragments/specs/InlineTree.integration.spec.ts`.
