## ADDED Requirements

### Requirement: Initialization marker on DataNodeAddedEvent
The system SHALL expose on `DataNodeAddedEvent` a boolean `detail.isInitialization`, which is `true` for data nodes created while a `BlockNode` is being constructed and `false` otherwise. The default is `false` when a constructor call omits it.

#### Scenario: Distinguishing initialization events
- **GIVEN** a consumer of model events receives a `DataNodeAddedEvent`
- **WHEN** it reads `detail.isInitialization`
- **THEN** it can tell a node created as part of a new block (`true`) from a node added to an existing block (`false`)

### Requirement: Array positions in data keys
The system SHALL treat a dot-notation data-key segment that is a non-negative integer as a position in an array, in the keypath utilities and in operation transformation. Tools SHALL NOT rely on digit-only object member names.

#### Scenario: Numeric segment addresses an array element
- **GIVEN** the data key `items.3.content`
- **WHEN** it is interpreted
- **THEN** `3` is the position of an element in the array at `items`, and `content` is a member of that element
