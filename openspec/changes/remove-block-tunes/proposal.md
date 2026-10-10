## Why

The Block Tune tool kind is dead weight. A registered tune gets a `BlockTuneFacade` built and sorted into `ToolsManager.blockTunes`, and then nothing ever reads it: no adapter, no rendering, no core wiring. Keeping it leaves a second, half-wired way to build what plugins now do, and it is the extension point PR #157 grew an adapter and a manager around.

This is one of three changes that replace the Block Tune entity with plugins (see the review on [PR #157](https://github.com/editor-js/document-model/pull/157)):
- `plugin-block-data`: the data layer.
- `block-settings-ui`: the UI surfaces.
- **`remove-block-tunes`** (this change): deleting the old entity.

It depends on neither of the others. Because the tune kind is non-functional, deleting it breaks no working feature, and its spec deltas (`sdk`, `core`) touch no requirement the other two changes touch. `plugin-block-data` renames the *model's* tune vocabulary; this change removes the *tool kind*.

## What Changes

- **SDK — remove the tune tool kind.** Delete `ToolType.Tune`, `BlockTune`, `BlockTuneConstructor`, `BlockTuneConstructorOptions`, `BlockTuneOptions`, `BlockTuneData`, and `BlockTuneFacade`, plus everything that references them:
  - `BaseToolFacade#isTune()` and `ToolsCollection#blockTunes` (its only consumer).
  - `BlockTuneConstructor` from the public `ToolConstructable` union and `BlockTuneFacade` from `ToolFacadeClass`.
  - `ToolTypeToOptions[ToolType.Tune]`, the `ToolStaticOptions` member, and the `BlockTuneOptions` re-exports.
  - `BlockToolOptionKey.Tunes` and its `BlockToolOptions` member — `tunes` is a tool *option*, not a constructor member.
  - `UserToolOptions.EnabledBlockTunes`, `BlockToolFacade#enabledBlockTunes` and `BlockToolFacade#tunes`.
  - The `./BlockTune.js` export from the entities barrel.

  **BREAKING** for anything that registers a tune through `core.use()` or sets a tool's `tunes` option.
- **Core — remove tune registration.** Remove the Tune branch from `Core#use`, the `getAll(ToolType.Tune)` preparation step, the Tune case in `ToolsFactory`, and `ToolsManager#blockTunes`.
- **"Tune" becomes a UI term only.** A former tune is written as a plugin that uses the block-settings API and plugin data.
- **`shortcuts-plugin` cleanup.** Its dead `#processBlockTune(_tool: BlockTuneFacade)` method and the `BlockTuneFacade` import go with the facade.
- **Close PR #157** as superseded by these three changes.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `sdk`: the `Tool and tune contracts` requirement becomes `Tool contracts` with no tune kind. `ToolsCollection` drops `blockTunes`.
- `core`: tool registration and validation no longer has a tune path.

## Impact

- **Packages:** `sdk`, `core`, and `shortcuts-plugin` (it imports `BlockTuneFacade`). `playground` has no tune references.
- **Out of scope:** the model layer's tune vocabulary (`BlockTuneName`, `BlockTuneSerialized`, `createBlockTuneName` and their `sdk` re-exports) is renamed by `plugin-block-data`, not here. A workspace-wide grep for `tunes` hits those legitimately.
- **Public API (breaking, pre-1.0):** the removed exports listed above.
- **Order:** independent. It can land before, after, or alongside the other two changes.
- **Docs to update:**
  - `docs/plugins.md`: the "Block Tune" row, and line 5, which advertises the SDK as re-exporting a `BlockTune` contract.
  - `docs/README.md`: the `BlockTune` contract mention.
  - `docs/diagrams/plugin-lifecycle-flow.mmd`: `ToolType.Tune` binding and `prepareTools(..., blockTunes)`.
  - The `shortcuts-plugin` spec's reserved-work note: "block tunes" → "block settings items".
  - `openspec/specs/sdk/spec.md`'s **Purpose** preamble ("interfaces for block tools, inline tools, block tunes, and plugins"). It sits outside any `### Requirement:` block, so the mechanical `openspec archive` fold will not touch it — edit it by hand in the same PR, like a new capability's Purpose.
