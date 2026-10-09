## 0. Preconditions

- [x] 0.1 Confirm `test/editorjs-e2e-and-aria-openspec` is merged into `main` and rebase onto it. It supplies `packages/ui/src/messages.ts`, the toolbar's ARIA/roving-tabindex behavior, the Playwright harness and `@editorjs/ui-kit` 2.x. If it has not landed, stop and re-plan
  - Landed as #187 (squash-merged; the branch is deleted). Verified on `main`: `packages/ui/src/messages.ts`, the Playwright harness under `packages/editorjs/e2e/` with `playwright.config.ts` and `playwright.voiceover.config.ts`, `@editorjs/ui-kit` `^2.0.0` in `packages/ui/package.json`, and the ARIA requirements in `openspec/specs/ui/spec.md`
- [x] 0.2 Refresh this change's `specs/ui/spec.md` delta from the merged `openspec/specs/ui/spec.md`, so the `Floating toolbar` requirement keeps that branch's ARIA scenarios instead of reverting them at archive time
  - The feared revert never applied: #187 put its ARIA work in **separate** requirements (`Accessible floating toolbar`, `The block actions toolbar is a single tab stop`), not into `Floating toolbar`
  - The delta now modifies all three, each header matching the merged spec verbatim. `Floating toolbar` keeps both merged scenarios and only widens the repositioning clause to "unless the Toolbox or block settings are open"; the settings button's ARIA assertions moved to the two requirements that own that vocabulary, each sitting beside the plus-button scenario it mirrors
  - Dropped the delta's own `Scenario: The toolbar keeps exactly one tab stop`: the merged `Scenario: Only one control is in the tab order` already asserts exactly-one-`tabindex="0"` across *all* of the container's controls, the settings button included
  - Added `Scenario: Block settings keyboard navigation is not intercepted`, mirroring the toolbox one — the settings popover is the second thing rendering inside the actions container whose arrow keys the toolbar must leave alone
- [x] 0.3 Resolve the "block actions" collision before writing any of it
  - **Resolved by renaming the plugin, not the toolbar.** `main` ships `messages.blockActionsToolbar = 'Block actions'` as the actions container's accessible name, asserted by `aria.spec.ts` in two places, relied on by `voiceover.spec.ts`, documented in the e2e README's locator table, and carried in the requirement name `The block actions toolbar is a single tab stop`. The plugin is still only spec text, so it is far the cheaper side to move
  - `@editorjs/block-actions-plugin` → `@editorjs/default-block-settings-plugin`, `static name` `block-actions` → `default-block-settings`, class `BlockActionsPlugin` → `DefaultBlockSettingsPlugin`, capability `block-actions-plugin` → `default-block-settings-plugin`
  - Rejected `block-operations` (`Operation`, `OperationsTransformer` and `ModifyOperationData` already own that word in `collaboration-manager`) and `block-controls` (the roving-tabindex requirement calls the container's children "controls" throughout). The chosen name states the plugin's actual role: the default entries of the block settings menu
  - Every surviving "block actions" in this change refers to the toolbar container and must stay verbatim, or the archive fold stops matching the merged requirement

## 1. UI test setup

- [x] 1.1 Add Jest to `packages/ui`: `jest.config.ts` with `testEnvironment: 'jsdom'`, a `moduleNameMapper` for `\.pcss$` and the `@codexteam/ui/styles*` side-effect imports, `transformIgnorePatterns` covering `@codexteam/*` as well as `@editorjs/*`, and the `test`/`test:coverage` scripts using `node --experimental-vm-modules`
- [x] 1.2 Add the dev dependencies: `jest`, `jest-environment-jsdom` (no package uses jsdom yet, so it must be explicit), `ts-jest`, `babel-jest`, `@babel/core`, `@babel/preset-env`, `@jest/globals`, `@types/jest`, `ts-node`
- [x] 1.3 Add a `files: ['**/*.spec.ts']` override to `packages/ui/eslint.config.mjs` allowing `@jest/globals`, mirroring `packages/core/eslint.config.mjs`, or `yarn lint` fails on the new specs
- [x] 1.4 Point `vite.config.ts`'s `dts()` at `tsconfig.build.json` so declaration emit keeps excluding `*.spec.ts`
- [x] 1.5 Add `.github/workflows/ui.yml` following `.github/workflows/core.yml`, and handle the first-run `base-coverage` step, which checks out the base ref and runs `test:coverage` for a package that has no such script there
  - `base-coverage` already skipped a package absent from the base ref, but `packages/ui/package.json` *is* there — only the script is missing, so the file test passed and `yarn workspace @editorjs/ui test:coverage` would have failed with "couldn't find a script". Its guard now also checks that the base ref declares `test:coverage`, which covers every future package that adds its first suite
- [x] 1.6 Hand-edit the note in `openspec/specs/ui/spec.md`'s preamble that says the package has no automated test suite — it sits outside any `### Requirement:` block, so the archive fold will not rewrite it

## 2. Block settings plugin

- [x] 2.1 Port the `BlockTunes*UIEvent` classes from PR #157 as `BlockSettings{Open,Opened,Closed,Rendered}UIEvent` under `ui/src/BlockSettings/events`, using `ui:block-settings:*` names. Credit ported work with `Co-authored-by: Betty Steger <244475+bettysteger@users.noreply.github.com>`
- [x] 2.2 Write failing `BlockSettings.spec.ts` cases:
  - the target block's id should be resolved from the reported index via `api.blocks.getIdByIndex`
  - providers should be called with `{ blockId, blockIndex, tool }` on each open
  - results should be ordered by `order` then registration, with separators between providers
  - `undefined`/empty results should contribute nothing
  - unregister should work
  - no popover should open when there are no items
  - `close()` should dispatch closed
  - the context handed to providers should carry `blockId`, and the spec's rule that handlers resolve positions from it should be covered by the default-block-settings tests
- [x] 2.3 Add a `UiComponentType.BlockSettings` member in `sdk` and declare it as `BlockSettingsUI`'s `static type` (`EditorjsPluginConstructor` requires an `EntityType` value)
- [x] 2.4 Implement `BlockSettingsUI` (`static name = 'block-settings'`, `publicApi: { register, close }`) on a ui-kit popover, porting its setup from PR #157's `BlockTunesUI` (`scopeElement: config.holder`, `searchable: false`, `wrapperTag: 'button'`, closed event from `PopoverEvent.Closed`, element handed over via the rendered event)
- [x] 2.5 Write failing tests, then give the popover an accessible name from a new `messages.ts` entry, and make removed items leave the accessibility tree
  - The menu is rebuilt from scratch on each open rather than edited in place. `removeItemByName` is ui-kit's only removal and a separator is constructed without params, so it has no name to be removed by; handing a fresh popover the whole item list is what guarantees the previous block's items leave the tree. The swap happens inside the plugin's own holder, so ui-kit's rendered DOM is never touched
- [x] 2.6 Write a failing test, then make a request with no resolvable block id a no-op (no providers invoked, no popover, no throw)
- [x] 2.7 Export `BlockSettingsUI` plus the `BlockSettingsAPI`/`BlockSettingsProvider` types from `@editorjs/ui`, and augment `EditorjsPluginApiMap` under `'block-settings'` there — `sdk` stays unaware of individual plugins

## 3. Toolbar settings button

- [x] 3.1 Port the settings button and styles from PR #157 into `ToolbarUI` (`IconMenuSmall`, the `__settings-button` rule, and `display: flex; align-items: center` on `__actions`), appending it **before** the roving-tabindex initialization so the toolbar keeps exactly one tab stop
- [x] 3.2 Take PR #157's fix for `new ToolboxOpenUIEvent('ui:toolbox:open')` passing a string instead of a payload object (`packages/ui/src/Toolbar/Toolbar.ts:151`), with a test that the dispatched event carries an object payload
  - The string type-checked because the payload interface is empty, so every listener had been receiving `detail: 'ui:toolbox:open'`. The event name was never affected -- it comes from the class -- so nothing downstream had to change with it
- [x] 3.3 Track the hovered block index in `ToolbarUI` from `ui:blocks:block-selected` (today the handler reads only `event.detail.block`), following `ToolboxUI`'s `#selectedBlockIndex`
- [x] 3.4 Write failing `Toolbar.spec.ts` cases:
  - clicking settings should dispatch `ui:block-settings:open` for the tracked block
  - the popover should be mounted on `ui:block-settings:rendered`
  - the toolbar should not reposition while settings are open
  - the settings button should have an accessible name from `messages.ts` and `aria-haspopup="menu"`
  - `aria-expanded` should follow `ui:block-settings:opened`/`closed`
  - the button should be focused before the popover opens
  - exactly one action button should have `tabindex="0"` after render
- [x] 3.5 Implement the behavior in `ToolbarUI`

## 4. Default block settings plugin

- [x] 4.1 Scaffold `packages/plugins/default-block-settings-plugin` as a full copy of `shortcuts-plugin`'s layout: `package.json` (the same `build`/`build:declaration`/`lint`/`lint:ci`/`lint:fix`/`test`/`test:coverage`/`test:mutations`/`clear` scripts), `tsconfig.json`, `tsconfig.build.json`, `tsconfig.eslint.json`, `eslint.config.mjs`, `jest.config.ts`, `stryker.conf.mjs`, `.gitignore`, `README.md`, `src/index.ts`, `src/index.spec.ts`
- [x] 4.2 Add `.github/workflows/default-block-settings-plugin.yml` following `shortcuts-plugin.yml` — without it the package is never linted, tested or built in CI
- [x] 4.3 Depend on `@editorjs/sdk` at runtime and on `@editorjs/ui` as a devDependency for `import type` only, so `api.plugins['block-settings']` typechecks without runtime coupling
  - `@codexteam/icons` turned out to be a second runtime dependency: the items carry icons, and the package was resolving it through workspace hoisting alone, which would break a standalone install. Declared it, and widened the capability's requirement text, which had said `@editorjs/sdk` was the only one
- [x] 4.4 Write failing tests:
  - should register at `order: 1000` on `core:ready`
  - should stay inert without `block-settings`
  - move up/down should call `api.blocks.move` and be disabled at the boundaries
  - handlers should resolve the block's index from `ctx.blockId` at activation, so an insertion above the block while the menu is open still moves the intended block
  - actions should do nothing when the target block no longer exists
  - delete should use `confirmation` and call `api.blocks.delete` by block id only on confirm
- [x] 4.5 Implement `DefaultBlockSettingsPlugin`, porting behavior and test cases from PR #157's internal delete/move-up/move-down tunes (keeping their `getIndexById`-at-activation approach) and adding the delete confirmation they lack. Credit with the `Co-authored-by` line from 2.1
- [x] 4.6 Register `BlockSettingsUI` and `DefaultBlockSettingsPlugin` in `@editorjs/editorjs`: add `"@editorjs/default-block-settings-plugin": "workspace:^"` to its `package.json`, update the lockfile, extend the `@editorjs/ui` mock factory in `editorjs/src/index.spec.ts` with `BlockSettingsUI`, add a `jest.unstable_mockModule` for the new package, and note that its assertions read `ctor.name` — which for `static name = 'default-block-settings'` is `'default-block-settings'`, not the class name
- [x] 4.7 Hand-edit `openspec/specs/editorjs-bundle/spec.md`'s Purpose preamble, which enumerates the default plugins — outside any requirement block, so the fold will not rewrite it
- [x] 4.8 Add `packages/editorjs/e2e/tests/block-settings.spec.ts` using the harness's `mountDocument(page, '?text=Alpha&text=Beta')` fixture: open settings on the second block, move it up, then delete it with confirmation. Confirm `include-e2e: true` is set for the bundle workflow

## 5. Docs and wrap-up

- [x] 5.1 Update `docs/plugins.md` (the block settings API and default-block-settings as the reference "tune") and `docs/events.md` (the `ui:block-settings:*` events)
- [x] 5.2 Run `yarn lint`, `yarn test`, and the e2e suite. Fix any regressions
  - Clean: lint and build workspace-wide, 1,099 unit tests, and 92 e2e across Chromium and WebKit. The one `✘` in the e2e run is `aria.spec.ts`'s `test.fail()` case for the unfixed `focus: true` caret todo, which Playwright counts as passing
- [ ] 5.3 Run `openspec validate block-settings-ui --type change` and confirm it passes. After archiving, fill the `## Purpose` of the new `block-settings` and `default-block-settings-plugin` specs from the proposal's intended-Purpose text

## 6. Review follow-ups

- [ ] 6.1 Write a failing `Blocks.spec.ts` case, then dispatch `BlockSelectedUIEvent` for the caret moving into a block as well as for `mouseenter`. Without it `#selectedBlockIndex` stays `-1` for anyone who never moves a pointer, and the settings button is a control that silently does nothing. Read the caret from the document selection: the editor's own caret state is cleared when focus leaves the editable, which is what reaching for the button does
- [ ] 6.2 Write a failing case, then make the settings button close an open menu instead of rebuilding it, per the menu button pattern. ui-kit closes the popover before the button's own handler runs, so the state has to be read on `mousedown` and tracked by the plugin. Cover it in the e2e suite too, since what is being asserted is a second real click
- [ ] 6.3 Add `getToolByIndex` to `BlocksAPI` (core + sdk) and read the provider context's `tool` through it. `api.document.data` serializes the whole document, and the menu was paying that on every open
- [ ] 6.4 Replace the two `api.document.data.blocks.length` reads in `DefaultBlockSettingsPlugin` with `api.blocks.getBlocksCount()`, for the same reason
- [ ] 6.5 Rename the UI package's `MenuConfig` to `BlockSettingsMenuConfig`: `@editorjs/sdk` already exports an unrelated `MenuConfig`, and the two are not interchangeable
- [ ] 6.6 Make `BlockSettingsUI`, `DefaultBlockSettingsPlugin` and `ToolbarUI` drop their event bus listeners in `destroy()`, and stop the plugin registering a provider after it has been destroyed
- [ ] 6.7 Restore `packages/ui`'s `build:declaration` to a script that emits declarations, now that it has dependencies to build first
