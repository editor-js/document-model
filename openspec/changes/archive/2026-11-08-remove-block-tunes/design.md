## Context

The Block Tune tool kind is spread across `sdk` and `core`:
- `ToolType.Tune`, `BlockTune`/`BlockTuneConstructor`/`BlockTuneOptions`/`BlockTuneData`, `BlockTuneFacade`, and `ToolsCollection#blockTunes` in `sdk`.
- The `use()` branch, `getAll(ToolType.Tune)`, `ToolsFactory`'s Tune case and `ToolsManager#blockTunes` in `core`.
- A `tunes` member on the `BlockTool` contract.

No tune is functional on `main`: nothing renders them and nothing connects them to the Model. Every tune use case is covered by a plain plugin — `plugin-block-data` gives such a plugin per-block storage and `block-settings-ui` gives it a menu — but neither has to land before the dead kind can go.

## Goals / Non-Goals

**Goals:**
- Remove the tune tool kind and every code path that registers, prepares or collects tunes.
- Leave no dangling references in docs or specs.

**Non-Goals:**
- A compatibility shim for v2 third-party tunes. None exists today, and one can be written later as a plugin that adapts a v2 tune to block settings and plugin data if there is demand.

## Decisions

### D1. Delete outright rather than deprecate
v3 is pre-1.0 and the tune path is non-functional, so a deprecation cycle would only keep dead code alive. Every removed export is listed in the proposal, for the PR description — the repo keeps no changelog files.

### D2. Drop the tool's `tunes` option with no replacement in the contract
The option is `BlockToolOptionKey.Tunes`, surfaced as `BlockToolFacade#enabledBlockTunes`. Nothing reads that getter today, so removing it breaks no behavior — but it is v2's per-tool allow-list ("enable these tunes for this tool"), and deleting it removes that integrator control with no replacement. That is deliberate: per-tool filtering now lives in the providers, which receive `tool` in their context and can opt out. If integrators ask for the allow-list back, it returns through `tool-plugin-options` as `options.plugins['block-settings']`, the existing channel for tool → plugin configuration, rather than as a member of the tool contract.

### D3. The model layer keeps its own renaming change
`BlockTuneName`, `BlockTuneSerialized` and `createBlockTuneName` are model-types names that `sdk` re-exports. They are renamed by `plugin-block-data`. This change removes only the tool kind, so its compile-time assertions enumerate tool-kind names explicitly instead of asserting that the string "tune" is gone from `sdk`.

## Risks / Trade-offs

- **[Removing the extension point before its replacement lands]** → accepted. A tune cannot render or store anything on `main`, so there is no working behavior to lose in the window before `block-settings-ui` lands.
- **[Leftover references]** → `shortcuts-plugin` is the one package that breaks, and it is named in the tasks. The workspace-wide search is scoped to the tool-kind symbols, because the model layer legitimately keeps its own (renamed) tune vocabulary until `plugin-block-data` lands.

## Migration Plan

Land whenever convenient — nothing sequences before it. Close PR #157 with links to the three changes. Rollback is reverting the PR.
