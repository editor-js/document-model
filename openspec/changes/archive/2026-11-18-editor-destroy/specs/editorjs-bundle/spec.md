## ADDED Requirements

### Requirement: Editor teardown
The `EditorJS` class SHALL expose a synchronous `destroy()` that delegates to the underlying `Core.destroy()`. This tears down the default UI, plugins, tools, DOM adapter, and the collaboration connection.

#### Scenario: Destroying a ready editor
- **GIVEN** `editor.isReady` has resolved
- **WHEN** `editor.destroy()` is called
- **THEN** the editor's DOM is removed from the holder, its collaboration socket is closed, and no listener it added to `document` or the holder remains

#### Scenario: Destroying before ready
- **GIVEN** `editor.isReady` has not settled
- **WHEN** `editor.destroy()` is called
- **THEN** `editor.isReady` rejects with a `DOMException` named `AbortError`, the editor never becomes interactive, and nothing is left in the holder

#### Scenario: Destroying before ready without awaiting readiness
- **GIVEN** nobody awaits or handles `editor.isReady`
- **WHEN** `editor.destroy()` is called before it settles
- **THEN** the `AbortError` rejection is not reported as an unhandled promise rejection

#### Scenario: Initialization failure without awaiting readiness
- **GIVEN** nobody awaits or handles `editor.isReady`
- **WHEN** initialization fails with an error other than `AbortError`
- **THEN** that error is logged with `console.error`, is not reported as an unhandled promise rejection, and `editor.isReady` still rejects with it for anyone who awaits it

#### Scenario: Several editors on one page
- **GIVEN** several `EditorJS` instances are mounted on one page
- **WHEN** each of them is destroyed
- **THEN** each destroy leaves the others working, and once all are destroyed no editor DOM nodes or editor-registered `document`/holder listeners remain
