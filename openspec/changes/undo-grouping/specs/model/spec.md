## ADDED Requirements

### Requirement: Grouped mutations
`EditorJSModel` SHALL provide `group(fn)`, which runs `fn` synchronously inside a group context and returns its result. Every document event created while the context is active SHALL carry that group's id in `detail.groupId`. The id is captured when the event is created and kept unchanged as the event is re-dispatched by `BlockNode`, `EditorDocument` and `EditorJSModel`. Events created outside any group SHALL carry `groupId: undefined`.

#### Scenario: Mutations inside a group share one id
- **GIVEN** `model.group(fn)` is called
- **WHEN** `fn` inserts text, splits a block and adds blocks
- **THEN** every `EventType.Changed` event the model dispatches for those mutations carries the same, defined `groupId`

#### Scenario: Separate groups get different ids
- **GIVEN** `model.group(fnA)` completes
- **WHEN** `model.group(fnB)` is called afterwards
- **THEN** the events of `fnB` carry a `groupId` different from the events of `fnA`

#### Scenario: Nested groups join the outer group
- **GIVEN** `model.group(outer)` is running
- **WHEN** `outer` calls `model.group(inner)`
- **THEN** the events created inside `inner` carry the same `groupId` as the events created directly inside `outer`

#### Scenario: Group id survives microtask-deferred dispatch
- **GIVEN** a block is added inside `model.group(fn)`, and `BlockNode` queues its `DataNodeAddedEvent`s in a microtask
- **WHEN** those events are dispatched after `fn` has returned
- **THEN** they carry the `groupId` that was active when the block was constructed

#### Scenario: Group context closes on throw
- **GIVEN** `fn` throws inside `model.group(fn)`
- **WHEN** the error propagates out of `group`
- **THEN** the group context is no longer active, so events created afterwards carry `groupId: undefined`

#### Scenario: Mutations outside a group
- **GIVEN** no group is active
- **WHEN** any mutation is made
- **THEN** its events carry `groupId: undefined`

Implemented in `src/EditorJSModel.ts` and `src/utils/Context.ts`, with ids captured at the event-creation sites in `src/entities/**`, validated by `src/EditorJSModel.spec.ts` and `src/EditorJSModel.integration.spec.ts`.
