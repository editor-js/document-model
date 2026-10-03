## ADDED Requirements

### Requirement: Grouped document changes
The `DocumentAPI` contract SHALL declare `group<T>(fn: () => T): T`, which runs `fn` synchronously and returns its result. All document changes that `fn` makes through the `EditorAPI` are treated as one unit of history: a single undo step.

#### Scenario: Plugin groups a multi-operation action
- **GIVEN** a plugin holds an `EditorAPI`
- **WHEN** it calls `api.document.group(() => { api.blocks.split(...); api.blocks.insertMany(...); })`
- **THEN** the call type-checks and returns the callback's return value

#### Scenario: Errors propagate
- **GIVEN** the callback passed to `api.document.group` throws
- **WHEN** `group` is called
- **THEN** the same error is re-thrown to the caller

Implemented in `src/api/DocumentAPI.ts`.
