# Default Block Settings Plugin

Built-in Editor.js plugin supplying the default entries of the block settings menu: **Move up**,
**Move down** and **Delete**.

It is an ordinary plugin, not a special kind of entity — the same `block-settings` API any other
plugin uses, registered at `order: 1000` so its items sit last in the menu. It is the reference
example of what used to be called a "block tune".

## Behaviour

- **Move up** / **Move down** call `api.blocks.move`. Each is disabled at the document boundary,
  evaluated when the menu is built.
- **Delete** asks for confirmation first, and deletes by block id on the second activation.

Every handler resolves the target block's current index from its id at activation time rather than
reusing the index the menu was built with. A menu can stay open while a collaborator inserts a
block above the target, or while an undo runs, and acting on the stale index would move the wrong
block. A disabled state can go stale the same way, but that only greys an item out.

Without a registered `block-settings` plugin — a headless `Core`, for instance — it stays inert and
throws nothing.

## Usage

Registered for you by `@editorjs/editorjs`. A headless `Core` opts in:

```ts
import { DefaultBlockSettingsPlugin } from '@editorjs/default-block-settings-plugin';

core.use(DefaultBlockSettingsPlugin);
```
