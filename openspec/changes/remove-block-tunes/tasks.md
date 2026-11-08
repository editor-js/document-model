## 1. Guard the removal with tests

- [ ] 1.1 Add type-level assertions (`@ts-expect-error`) that these no longer exist: `ToolType.Tune`, the `BlockTune*` entity exports, `BlockTuneFacade`, `BlockToolOptionKey.Tunes`, `BlockToolOptions['tunes']`, `UserToolOptions.EnabledBlockTunes` and `BlockToolFacade#enabledBlockTunes`. Enumerate tool-kind names only — the model-layer `BlockTuneName`/`BlockTuneSerialized` re-exports belong to `plugin-block-data`
- [ ] 1.2 Write a failing `ToolsCollection` spec case: the collection should expose only `blockTools`/`inlineTools`. Also write a `Core`/`ToolsManager` case: a plugin that contributes block settings items should be instantiated as a plugin and absent from the tool collections

## 2. Remove from SDK

- [ ] 2.1 Delete `sdk/src/entities/BlockTune.ts` and `sdk/src/tools/facades/BlockTuneFacade.ts` (with its spec), and remove their exports
- [ ] 2.2 Remove `ToolType.Tune`, `BaseToolFacade#isTune()` and `ToolsCollection#blockTunes` (its only consumer)
- [ ] 2.3 Remove `BlockTuneConstructor` from `ToolConstructable`, `BlockTuneFacade` from `ToolFacadeClass` (and its export), `ToolTypeToOptions[ToolType.Tune]`, the `ToolStaticOptions` member, the `BlockTuneOptions` re-exports in `BaseTool.ts`/`BaseToolFacade.ts`, and the `./BlockTune.js` line in the entities barrel
- [ ] 2.4 Remove `BlockToolOptionKey.Tunes` and its `BlockToolOptions` member, `UserToolOptions.EnabledBlockTunes`, `BlockToolFacade#enabledBlockTunes` and `BlockToolFacade#tunes`

## 3. Remove from Core and dependents

- [ ] 3.1 Remove the Tune branch from `Core#use`, the `getAll(ToolType.Tune)` step in tool preparation, the Tune case in `ToolsFactory`, and `ToolsManager#blockTunes`
- [ ] 3.2 Remove `#processBlockTune` and the `BlockTuneFacade` import from `packages/plugins/shortcuts-plugin/src/index.ts`
- [ ] 3.3 Grep the workspace for the removed tool-kind symbols (not the bare word `tunes`, which the model layer still uses until `plugin-block-data` lands), fix any leftovers, and confirm `yarn build` is clean

## 4. Docs and wrap-up

- [ ] 4.1 Update `docs/plugins.md` (the "Block Tune" table row and the SDK re-export list on line 5), `docs/README.md` (drop the `BlockTune` contract mention) and `docs/diagrams/plugin-lifecycle-flow.mmd` (drop the `ToolType.Tune` binding and `blockTunes`)
- [ ] 4.2 Hand-edit the **Purpose** preamble of `openspec/specs/sdk/spec.md` to drop "block tunes" — the mechanical archive fold only rewrites `### Requirement:` blocks
- [ ] 4.3 Change the `shortcuts-plugin` spec's reserved-work note from "block tunes" to "block settings items"
- [ ] 4.4 Run `yarn lint` and `yarn test`. Fix any regressions
- [ ] 4.5 Comment on PR #157 linking `plugin-block-data`, `block-settings-ui` and `remove-block-tunes` as its replacement
- [ ] 4.6 Run `openspec validate remove-block-tunes --type change` and confirm it passes
