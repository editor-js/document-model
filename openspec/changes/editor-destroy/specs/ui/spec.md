## MODIFIED Requirements

### Requirement: UI plugin listener lifetime
Each UI plugin SHALL unsubscribe its own EventBus and DOM listeners when destroyed, detach its owned holder, and dispose its owned popover. Destroying one instance SHALL leave other consumers on the shared EventBus active. Teardown SHALL be safe to repeat.

#### Scenario: Events after teardown
- **GIVEN** a UI plugin has been destroyed
- **WHEN** the shared EventBus emits a previously subscribed event or a retained DOM element receives an event
- **THEN** that instance no longer renders, moves elements, or dispatches UI actions
- **AND** unrelated listeners and a replacement plugin still receive their events

#### Scenario: Pending inline toolbar configuration
- **GIVEN** inline tool configuration is still resolving when the toolbar is destroyed
- **WHEN** the configuration finishes resolving
- **THEN** no popover is created, shown, or positioned by the destroyed toolbar

#### Scenario: Opening a destroyed toolbox
- **GIVEN** `ToolboxUI` has been destroyed
- **WHEN** its `open()` is called
- **THEN** no popover is shown and no `ToolboxOpenedUIEvent` is dispatched

#### Scenario: Repeated teardown
- **GIVEN** a UI plugin has been destroyed
- **WHEN** `destroy()` is called again
- **THEN** it returns without releasing anything a second time

#### Scenario: Inline tool instances are released with their popover
- **GIVEN** the inline toolbar created inline tool instances to build its popover
- **WHEN** the popover is rebuilt for a new selection, the toolbar is hidden, a render is superseded before it finishes, or the toolbar is destroyed
- **THEN** each instance created for that popover has its optional `destroy()` called once, and the instances behind the popover still shown are not destroyed

Validated by `src/lifecycle.spec.ts` using real DOM/EventBus listeners and a substituted popover boundary. Vendor-owned global listener internals are outside this requirement's verification scope.
