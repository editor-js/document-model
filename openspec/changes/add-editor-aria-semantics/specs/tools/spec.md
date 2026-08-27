## ADDED Requirements

### Requirement: Accessible paragraph block
`Paragraph` SHALL expose its contenteditable text element as an editable text field to assistive technology, via `role="textbox"`, `aria-multiline="true"`, and a non-empty `aria-label` identifying it as a paragraph block.

#### Scenario: Paragraph contenteditable is an accessible textbox
- **GIVEN** a `Paragraph` instance has lazily created its contenteditable `<div>`
- **WHEN** the element is inspected
- **THEN** it has `role="textbox"`, `aria-multiline="true"`, and a non-empty `aria-label`

#### Scenario: Every block is exposed as a text field of its own
- **GIVEN** the editor has rendered a document of several paragraph blocks
- **WHEN** the accessibility tree is inspected
- **THEN** each block exposes its own `role="textbox"` with its own accessible name
- **AND** assistive technology can move between them in document order

### Requirement: Paragraph placeholder is announced
A contenteditable element has no native `placeholder`, so an empty block would otherwise be announced as an unlabelled empty field with no indication of what belongs in it. `Paragraph` SHALL expose the placeholder it is configured with (`config.placeholder`, which the editor fills from its own `placeholder` option for the default block tool) as `aria-placeholder` on its contenteditable element, and SHALL omit the attribute when no placeholder is configured.

#### Scenario: Configured placeholder reaches assistive technology
- **GIVEN** the editor is configured with a `placeholder` and `Paragraph` is the default block tool
- **WHEN** an empty paragraph block's contenteditable element is inspected
- **THEN** it has `aria-placeholder` set to the configured text

#### Scenario: No placeholder configured
- **GIVEN** the editor is configured without a `placeholder`
- **WHEN** a paragraph block's contenteditable element is inspected
- **THEN** it has no `aria-placeholder` attribute
