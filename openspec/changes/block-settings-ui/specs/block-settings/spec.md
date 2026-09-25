## ADDED Requirements

### Requirement: Block settings plugin
The system SHALL provide `BlockSettingsUI`, an `EditorjsPlugin` with static `name` `block-settings`, that renders a per-block settings popover. The popover SHALL open on a `ui:block-settings:open` event targeting a block, SHALL announce its element via `ui:block-settings:rendered`, and SHALL dispatch `ui:block-settings:opened` and `ui:block-settings:closed` when its open state changes.

#### Scenario: Opening settings for a block
- **GIVEN** at least one settings provider is registered
- **WHEN** a `ui:block-settings:open` event targeting block index 2 is dispatched
- **THEN** the popover opens populated with the items the providers return for block 2, and `ui:block-settings:opened` is dispatched

#### Scenario: Closing settings
- **GIVEN** the settings popover is open
- **WHEN** it is closed by the user, by an item with default close-on-activate, or by `api.plugins['block-settings'].close()`
- **THEN** `ui:block-settings:closed` is dispatched

#### Scenario: No items for a block
- **GIVEN** every registered provider returns nothing for the target block
- **WHEN** settings are requested for that block
- **THEN** the popover is not opened

#### Scenario: No target block
- **GIVEN** no block has been selected, so the requested index resolves to no block id
- **WHEN** block settings are requested
- **THEN** no provider is invoked, the popover is not opened, and no error is thrown

### Requirement: Block settings menu is accessible
The settings popover SHALL carry an accessible name drawn from the UI package's message catalogue, in the same way the toolbox menu is named. Items removed from the menu SHALL leave the accessibility tree rather than remaining hidden but present.

#### Scenario: Menu is named
- **WHEN** the block settings popover opens
- **THEN** it exposes an accessible name from the message catalogue, so a screen reader announces what the menu is

#### Scenario: Removed items leave the tree
- **GIVEN** the menu is rebuilt for a different block with fewer items
- **WHEN** the previous items are removed
- **THEN** they are no longer reachable in the accessibility tree

### Requirement: Settings provider registration
`BlockSettingsUI` SHALL expose a `publicApi` with `register(provider, options?)` that returns an unregister function. A provider SHALL be a function receiving `{ blockId, blockIndex, tool }` for the target block and returning a `MenuConfig`, a promise of one, or `undefined`. In that context `blockId` identifies the block for as long as it exists, while `blockIndex` is only its position at the moment the menu was built, so an item's handler SHALL resolve the block's current position from `blockId` rather than reusing `blockIndex`. Providers SHALL be invoked each time the popover opens, and their results SHALL be concatenated in ascending `options.order` (default `0`, ties broken by registration order), with a separator between the contributions of different providers. Item behavior SHALL be taken entirely from the returned `MenuConfig` (`onActivate`, `isActive`, `isDisabled`, `closeOnActivate`, `children`, or a `confirmation` object whose own handler runs on the second activation — a confirmation item carries no top-level `onActivate`).

#### Scenario: Plugin contributes an item
- **GIVEN** a plugin calls `api.plugins['block-settings'].register(ctx => ({ title: 'Anchor', icon, onActivate: () => ... }))`
- **WHEN** block settings open for any block
- **THEN** an "Anchor" item is shown, and activating it calls the provider's `onActivate`

#### Scenario: Provider opts out for a tool
- **GIVEN** a provider returns `undefined` when `ctx.tool` is `"image"`
- **WHEN** block settings open for an image block
- **THEN** that provider contributes no items and no separator

#### Scenario: Item acts on the block it was built for
- **GIVEN** a provider returns an item whose `onActivate` resolves the block's position from `ctx.blockId`
- **WHEN** the document changes while the menu is open and the item is then activated
- **THEN** the action applies to that same block, because positions are resolved at activation rather than taken from `ctx.blockIndex`

#### Scenario: Items reflect current state
- **GIVEN** a provider derives an item's `isActive` from state it reads when called (e.g. the block's data via `EditorAPI`)
- **WHEN** that state changes and settings are opened again
- **THEN** the item's active state reflects the new data

#### Scenario: Ordering providers
- **GIVEN** provider A is registered with `order: 1000` before provider B with default order
- **WHEN** settings open
- **THEN** B's items are shown before A's

#### Scenario: Unregistering a provider
- **GIVEN** a provider was registered and its returned unregister function is called
- **WHEN** settings open afterwards
- **THEN** that provider is not invoked

#### Scenario: Item with confirmation
- **GIVEN** a provider returns an item with a `confirmation` config and no top-level `onActivate`
- **WHEN** the user activates the item
- **THEN** the item switches to its confirmation state, and only activating the confirmation runs the handler declared inside `confirmation`
