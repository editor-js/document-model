## ADDED Requirements

### Requirement: Listener teardown through AbortController
Every first-party component that registers event listeners (core services, adapters, plugins, UI, and SDK base classes) SHALL own an `AbortController`, pass its `signal` to each listener registration it makes, and release all of those listeners by calling `abort()` in its teardown. This applies to `EventTarget` registrations (EventBus, the model, DOM nodes, `document`, `window`). For subscriptions that return an unsubscribe function (`api.document.onUpdate`, `api.selection.onCaretUpdate`, the `selectionchange` watcher), the component SHALL register that function as an `abort` listener on its controller's `signal`. A component SHALL NOT store handler references or unsubscribe functions in fields only to remove listeners. Resources that aren't listeners, such as timers, sockets, DOM nodes, popovers, and tool instances, are released explicitly.

When an SDK base class registers listeners, the base class SHALL own the controller, expose its `signal` to subclasses as a protected member, and abort it in its own `destroy()`. Subclasses SHALL pass that `signal` to their own registrations rather than creating a second controller or overriding `destroy()` to remove listeners.

#### Scenario: Teardown removes every listener at once
- **GIVEN** a component that registered listeners on the EventBus, the model, and a DOM node using its controller's `signal`
- **WHEN** its teardown calls `abort()`
- **THEN** none of those listeners fire for events dispatched afterwards

#### Scenario: Subscription that returns an unsubscribe function
- **GIVEN** a component subscribed through `api.document.onUpdate` and registered the returned function as an `abort` listener on its controller's `signal`
- **WHEN** the component's teardown calls `abort()`
- **THEN** the subscription is removed, and later model changes don't reach its callback

#### Scenario: Subclass of an SDK base class
- **GIVEN** a class extending an SDK base class registers an extra EventBus listener with the inherited `signal`
- **WHEN** the base class's `destroy()` runs
- **THEN** both the base class's listeners and the subclass's listener are removed, and the subclass doesn't need to override `destroy()` to do it
