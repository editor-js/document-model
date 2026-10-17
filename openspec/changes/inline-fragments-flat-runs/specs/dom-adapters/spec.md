## MODIFIED Requirements

### Requirement: Inline formatting rendering
The system SHALL provide `FormattingAdapter`, which registers `InlineTool` instances (from `core:ToolLoaded` events) and renders `InlineFragment`s as DOM wrapper elements, re-rendering affected ranges on `TextFormattedEvent`/`TextUnformattedEvent`. Because fragments are returned whole and can reach outside the queried range, the adapter SHALL widen the range to the boundaries of the returned fragments and query again until the range stops growing, and SHALL render the range with every fragment overlapping it, so formatting that only overlaps the widened range is not lost.

#### Scenario: Re-rendering overlapping formats
- **GIVEN** a `TextFormattedEvent` or `TextUnformattedEvent` affecting a range
- **WHEN** the adapter re-renders that range
- **THEN** it expands the range by one character on each side to catch adjacent boundary fragments, extracts the range into a template, wraps overlapping fragments using each tool's `createWrapper(data)` output, and replaces the DOM range contents so overlapping/adjacent inline formats nest correctly

#### Scenario: Formatting that only overlaps the widened range
- **GIVEN** text `abcdefghij` with italic `[0, 2)` and bold `[0, 10)`
- **WHEN** italic is applied over `[8, 9)`
- **THEN** the adapter re-renders `[0, 10)` with bold `[0, 10)`, italic `[0, 2)` and italic `[8, 9)`, so italic `[0, 2)` stays in the DOM

#### Scenario: Partially unformatting a fragment that contains others
- **GIVEN** text `abcdefghij` with bold `[0, 10)`, italic `[0, 2)` and italic `[8, 10)`
- **WHEN** bold is removed over `[4, 6)`
- **THEN** the adapter re-renders `[0, 10)` with bold `[0, 4)`, bold `[6, 10)` and both italic fragments

Implemented in `src/FormattingAdapter/index.ts`, `src/utils/collectFragmentsToRender.ts`, `src/utils/surround.ts`, `src/utils/expandRangeNodeBoundary.ts`.
