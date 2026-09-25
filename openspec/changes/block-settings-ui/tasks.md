## 0. Preconditions

- [ ] 0.1 Confirm `test/editorjs-e2e-and-aria-openspec` is merged into `main` and rebase onto it. It supplies `packages/ui/src/messages.ts`, the toolbar's ARIA/roving-tabindex behavior, the Playwright harness and `@editorjs/ui-kit` 2.x. If it has not landed, stop and re-plan
- [ ] 0.2 Refresh this change's `specs/ui/spec.md` delta from the merged `openspec/specs/ui/spec.md`, so the `Floating toolbar` requirement keeps that branch's ARIA scenarios instead of reverting them at archive time

## 1. UI test setup

- [ ] 1.1 Add Jest to `packages/ui`: `jest.config.ts` with `testEnvironment: 'jsdom'`, a `moduleNameMapper` for `\.pcss$` and the `@codexteam/ui/styles*` side-effect imports, `transformIgnorePatterns` covering `@codexteam/*` as well as `@editorjs/*`, and the `test`/`test:coverage` scripts using `node --experimental-vm-modules`
- [ ] 1.2 Add the dev dependencies: `jest`, `jest-environment-jsdom` (no package uses jsdom yet, so it must be explicit), `ts-jest`, `babel-jest`, `@babel/core`, `@babel/preset-env`, `@jest/globals`, `@types/jest`, `ts-node`
- [ ] 1.3 Add a `files: ['**/*.spec.ts']` override to `packages/ui/eslint.config.mjs` allowing `@jest/globals`, mirroring `packages/core/eslint.config.mjs`, or `yarn lint` fails on the new specs
- [ ] 1.4 Point `vite.config.ts`'s `dts()` at `tsconfig.build.json` so declaration emit keeps excluding `*.spec.ts`
- [ ] 1.5 Add `.github/workflows/ui.yml` following `.github/workflows/core.yml`, and handle the first-run `base-coverage` step, which checks out the base ref and runs `test:coverage` for a package that has no such script there
- [ ] 1.6 Hand-edit the note in `openspec/specs/ui/spec.md`'s preamble that says the package has no automated test suite — it sits outside any `### Requirement:` block, so the archive fold will not rewrite it

## 2. Block settings plugin

- [ ] 2.1 Port the `BlockTunes*UIEvent` classes from PR #157 as `BlockSettings{Open,Opened,Closed,Rendered}UIEvent` under `ui/src/BlockSettings/events`, using `ui:block-settings:*` names. Credit ported work with `Co-authored-by: Betty Steger <244475+bettysteger@users.noreply.github.com>`
- [ ] 2.2 Write failing `BlockSettings.spec.ts` cases:
  - the target block's id should be resolved from the reported index via `api.blocks.getIdByIndex`
  - providers should be called with `{ blockId, blockIndex, tool }` on each open
  - results should be ordered by `order` then registration, with separators between providers
  - `undefined`/empty results should contribute nothing
  - unregister should work
  - no popover should open when there are no items
  - `close()` should dispatch closed
  - the context handed to providers should carry `blockId`, and the spec's rule that handlers resolve positions from it should be covered by the block-actions tests
- [ ] 2.3 Add a `UiComponentType.BlockSettings` member in `sdk` and declare it as `BlockSettingsUI`'s `static type` (`EditorjsPluginConstructor` requires an `EntityType` value)
- [ ] 2.4 Implement `BlockSettingsUI` (`static name = 'block-settings'`, `publicApi: { register, close }`) on a ui-kit popover, porting its setup from PR #157's `BlockTunesUI` (`scopeElement: config.holder`, `searchable: false`, `wrapperTag: 'button'`, closed event from `PopoverEvent.Closed`, element handed over via the rendered event)
- [ ] 2.5 Write failing tests, then give the popover an accessible name from a new `messages.ts` entry, and make removed items leave the accessibility tree
- [ ] 2.6 Write a failing test, then make a request with no resolvable block id a no-op (no providers invoked, no popover, no throw)
- [ ] 2.7 Export `BlockSettingsUI` plus the `BlockSettingsAPI`/`BlockSettingsProvider` types from `@editorjs/ui`, and augment `EditorjsPluginApiMap` under `'block-settings'` there — `sdk` stays unaware of individual plugins

## 3. Toolbar settings button

- [ ] 3.1 Port the settings button and styles from PR #157 into `ToolbarUI` (`IconMenuSmall`, the `__settings-button` rule, and `display: flex; align-items: center` on `__actions`), appending it **before** the roving-tabindex initialization so the toolbar keeps exactly one tab stop
- [ ] 3.2 Take PR #157's fix for `new ToolboxOpenUIEvent('ui:toolbox:open')` passing a string instead of a payload object (`packages/ui/src/Toolbar/Toolbar.ts:151`), with a test that the dispatched event carries an object payload
- [ ] 3.3 Track the hovered block index in `ToolbarUI` from `ui:blocks:block-selected` (today the handler reads only `event.detail.block`), following `ToolboxUI`'s `#selectedBlockIndex`
- [ ] 3.4 Write failing `Toolbar.spec.ts` cases:
  - clicking settings should dispatch `ui:block-settings:open` for the tracked block
  - the popover should be mounted on `ui:block-settings:rendered`
  - the toolbar should not reposition while settings are open
  - the settings button should have an accessible name from `messages.ts` and `aria-haspopup="menu"`
  - `aria-expanded` should follow `ui:block-settings:opened`/`closed`
  - the button should be focused before the popover opens
  - exactly one action button should have `tabindex="0"` after render
- [ ] 3.5 Implement the behavior in `ToolbarUI`

## 4. Block actions plugin

- [ ] 4.1 Scaffold `packages/plugins/block-actions-plugin` as a full copy of `shortcuts-plugin`'s layout: `package.json` (the same `build`/`build:declaration`/`lint`/`lint:ci`/`lint:fix`/`test`/`test:coverage`/`test:mutations`/`clear` scripts), `tsconfig.json`, `tsconfig.build.json`, `tsconfig.eslint.json`, `eslint.config.mjs`, `jest.config.ts`, `stryker.conf.mjs`, `.gitignore`, `README.md`, `src/index.ts`, `src/index.spec.ts`
- [ ] 4.2 Add `.github/workflows/block-actions-plugin.yml` following `shortcuts-plugin.yml` — without it the package is never linted, tested or built in CI
- [ ] 4.3 Depend on `@editorjs/sdk` at runtime and on `@editorjs/ui` as a devDependency for `import type` only, so `api.plugins['block-settings']` typechecks without runtime coupling
- [ ] 4.4 Write failing tests:
  - should register at `order: 1000` on `core:ready`
  - should stay inert without `block-settings`
  - move up/down should call `api.blocks.move` and be disabled at the boundaries
  - handlers should resolve the block's index from `ctx.blockId` at activation, so an insertion above the block while the menu is open still moves the intended block
  - actions should do nothing when the target block no longer exists
  - delete should use `confirmation` and call `api.blocks.delete` by block id only on confirm
- [ ] 4.5 Implement `BlockActionsPlugin`, porting behavior and test cases from PR #157's internal delete/move-up/move-down tunes (keeping their `getIndexById`-at-activation approach) and adding the delete confirmation they lack. Credit with the `Co-authored-by` line from 2.1
- [ ] 4.6 Register `BlockSettingsUI` and `BlockActionsPlugin` in `@editorjs/editorjs`: add `"@editorjs/block-actions-plugin": "workspace:^"` to its `package.json`, update the lockfile, extend the `@editorjs/ui` mock factory in `editorjs/src/index.spec.ts` with `BlockSettingsUI`, add a `jest.unstable_mockModule` for the new package, and note that its assertions read `ctor.name` — which for `static name = 'block-actions'` is `'block-actions'`, not the class name
- [ ] 4.7 Hand-edit `openspec/specs/editorjs-bundle/spec.md`'s Purpose preamble, which enumerates the default plugins — outside any requirement block, so the fold will not rewrite it
- [ ] 4.8 Add `packages/editorjs/e2e/tests/block-settings.spec.ts` using the harness's `mountDocument(page, '?text=Alpha&text=Beta')` fixture: open settings on the second block, move it up, then delete it with confirmation. Confirm `include-e2e: true` is set for the bundle workflow

## 5. Docs and wrap-up

- [ ] 5.1 Update `docs/plugins.md` (the block settings API and block-actions as the reference "tune") and `docs/events.md` (the `ui:block-settings:*` events)
- [ ] 5.2 Run `yarn lint`, `yarn test`, and the e2e suite. Fix any regressions
- [ ] 5.3 Run `openspec validate block-settings-ui --type change` and confirm it passes. After archiving, fill the `## Purpose` of the new `block-settings` and `block-actions-plugin` specs from the proposal's intended-Purpose text
