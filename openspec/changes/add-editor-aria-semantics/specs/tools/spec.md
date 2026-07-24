## ADDED Requirements

### Requirement: Accessible paragraph block
`Paragraph` SHALL set an `aria-label` on its contenteditable text element identifying it as a paragraph block, so assistive technology announces the block's purpose when focus enters it.

#### Scenario: Paragraph contenteditable has an accessible name
- **GIVEN** a `Paragraph` instance has lazily created its contenteditable `<div>`
- **WHEN** the element is inspected
- **THEN** it has a non-empty `aria-label`
