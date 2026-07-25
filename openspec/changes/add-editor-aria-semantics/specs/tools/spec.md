## ADDED Requirements

### Requirement: Accessible paragraph block
`Paragraph` SHALL expose its contenteditable text element as an editable text field to assistive technology, via `role="textbox"`, `aria-multiline="true"`, and a non-empty `aria-label` identifying it as a paragraph block.

#### Scenario: Paragraph contenteditable is an accessible textbox
- **GIVEN** a `Paragraph` instance has lazily created its contenteditable `<div>`
- **WHEN** the element is inspected
- **THEN** it has `role="textbox"`, `aria-multiline="true"`, and a non-empty `aria-label`
