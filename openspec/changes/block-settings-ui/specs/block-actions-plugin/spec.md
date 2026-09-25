## ADDED Requirements

### Requirement: Default block actions plugin
The system SHALL provide `@editorjs/block-actions-plugin`, an `EditorjsPlugin` with static `name` `block-actions` that depends only on `@editorjs/sdk`. Once the editor is ready, it SHALL register a settings provider with `block-settings` at `order: 1000`, contributing "Move up", "Move down" and "Delete" items for every block. When no `block-settings` plugin is registered, it SHALL do nothing and SHALL NOT throw.

#### Scenario: Items are contributed
- **GIVEN** `BlockSettingsUI` and `BlockActionsPlugin` are both registered
- **WHEN** block settings open for a block in the middle of the document
- **THEN** "Move up", "Move down" and "Delete" items are shown after the items of providers with a lower order

#### Scenario: Block settings absent
- **GIVEN** `BlockActionsPlugin` is registered on a `Core` without `BlockSettingsUI`
- **WHEN** the editor becomes ready
- **THEN** no error is thrown and the plugin stays inert

### Requirement: Moving a block from settings
"Move up" SHALL move the target block one index up via `api.blocks.move`, and "Move down" one index down. "Move up" SHALL be disabled for the first block and "Move down" for the last block, evaluated when the menu is built. Every action SHALL resolve the target block's current index from its id when the item is activated, not reuse the index captured when the menu opened, and SHALL do nothing when that lookup reports no such block (the block-index lookup returns `-1` rather than throwing).

#### Scenario: Moving up
- **GIVEN** settings are open for the block at index 2
- **WHEN** "Move up" is activated
- **THEN** `api.blocks.move({ fromIndex: 2, toIndex: 1 })` is performed and the block is now at index 1

#### Scenario: The document changed while the menu was open
- **GIVEN** settings are open for block `b1`, which was at index 2, and a collaborator then inserts a block above it
- **WHEN** "Move up" is activated
- **THEN** the index is resolved again from `b1`, so `b1` moves from index 3 to index 2 rather than a different block being moved

#### Scenario: Target block is gone
- **GIVEN** settings are open for block `b1` and `b1` is removed, by a collaborator or an undo, while the menu is open
- **WHEN** "Move up", "Move down" or "Delete" is activated
- **THEN** nothing happens and no error is thrown

#### Scenario: Boundary blocks
- **GIVEN** a document with three blocks
- **WHEN** settings open for the block at index 0, and later for the block at index 2
- **THEN** "Move up" is disabled for index 0, and "Move down" is disabled for index 2

### Requirement: Deleting a block from settings
"Delete" SHALL require confirmation: activating it SHALL switch the item to a confirmation state, and only activating the confirmation SHALL delete the target block via `api.blocks.delete` by block id.

#### Scenario: Confirming deletion
- **GIVEN** settings are open for block `b1`
- **WHEN** "Delete" is activated and then its confirmation is activated
- **THEN** block `b1` is removed from the document

#### Scenario: Abandoning deletion
- **GIVEN** "Delete" was activated once and shows its confirmation state
- **WHEN** the popover is closed without activating the confirmation
- **THEN** no block is deleted
