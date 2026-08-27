## 1. SDK-owned `ToolConfig`

- [x] 1.1 Add a failing test in `packages/sdk/src/entities/BaseTool.spec.ts` — `it('should expose ToolConfig from the SDK itself rather than re-export it from @editorjs/editorjs')` — asserting `BaseToolOptions` references the SDK-owned type
- [x] 1.2 Define `ToolConfig` in `packages/sdk/src/entities/BaseTool.ts` as an SDK-owned generic type, replacing the `@editorjs/editorjs` re-export, and update `BaseToolOptions<Config extends ToolConfig>`
- [x] 1.3 Update `BlockTool.ts`, `InlineTool.ts`, and `BlockTune.ts` to import `ToolConfig` from the new location — each re-declares its own `Config extends ToolConfig = ToolConfig` bound rather than inheriting `BaseToolOptions`' one, so this is covered by its own test (`should keep the config option checked on every tool subtype`)

## 2. `options` as a config factory

- [x] 2.1 Add a failing test in `packages/sdk/src/entities/BaseTool.spec.ts` — `it('should accept a synchronous factory of the tool config as static options')` — asserting a `BaseToolConstructor` type-checks with `options` declared as `(config: Config) => Options`
- [x] 2.2 Add a failing test asserting the object form still type-checks unchanged — `it('should accept a plain options object as static options')`
- [x] 2.3 Define `ToolOptionsFactory<Config, Options>` in `packages/sdk/src/entities/BaseTool.ts` and widen `BaseToolConstructor.options` to `Options | ToolOptionsFactory<Config, Options>`
- [x] 2.4 Propagate the widened `options` type through `BlockToolConstructor`, `InlineToolConstructor`, and `BlockTuneConstructor` — no production change was needed: all three extend `BaseToolConstructor<Config, XOptions>` without re-declaring `options`, so they inherit the union. Pinned by `it('should carry the factory form through to every tool subtype constructor')`
- [x] 2.5 Confirm `BaseToolConstructor.prepare()` keeps its current `void | Promise<void>` return type — design.md Decision 3 deliberately leaves this hook untouched

## 3. Resolving the factory in `BaseToolFacade`

- [x] 3.1 Add a failing test in `packages/sdk/src/tools/facades/BaseToolFacade.spec.ts` — `it('should call the options factory once with the config passed at use() time')`
- [x] 3.2 Add a failing test — `it('should not call the options factory again when option getters are read repeatedly')`
- [x] 3.3 Add a failing test — `it('should leave the tool class options untouched after resolving the factory')`
- [x] 3.4 Add a failing test — `it('should resolve options independently for two facades wrapping the same tool class with different configs')` (the multi-`Core` case, design.md Decision 6)
- [x] 3.5 Add a failing test — `it('should merge factory-returned config defaults with the use()-time config')` — covering that a tool instance receives the defaults the factory applied
- [x] 3.6 Implement the private resolved-options field in the `BaseToolFacade` constructor: invoke the factory with `useToolOptions.config ?? {}` when `options` is a function, otherwise use the object as-is. Declared `protected readonly` rather than `#private` because `BlockToolFacade` reads it (group 5); per-instance semantics are unchanged
- [x] 3.7 Point the `options` and `config` getters at the resolved field instead of `constructable.options`

## 4. Reading resolved options in `BlockToolFacade`

- [x] 4.1 Add failing tests for `BlockToolFacade.toolbox` covering both tiers against a factory-derived value — `it('should derive toolbox entries from the config passed at use() time')`, `it('should merge a use()-time toolbox override onto a factory-derived value')`, and `it('should hide the tool when a use()-time toolbox is false despite a factory-derived value')`
- [x] 4.2 Add a failing test — `it('should read isReadOnlySupported from the resolved static options')`
- [x] 4.3 Point `BlockToolFacade.toolbox` and `isReadOnlySupported` at the resolved static options, leaving the array/object positional-merge algorithm and its two tiers unchanged
- [x] 4.4 Confirm the existing object-form toolbox tests still pass unmodified — **none existed**: the toolbox merge algorithm had no test coverage at all. Added five characterization tests in the new `BlockToolFacade.spec.ts` (empty, single-entry wrapping, `false` hiding, array-onto-array positional merge, object-onto-object merge) and confirmed they pass before and after 4.3

## 5. Migrating in-repo tools

- [x] 5.1 Update `packages/tools/{paragraph,bold,italic,inline-link}` to import `ToolConfig`/their `Config` type from the new SDK location, keeping the plain-object form of `static options` — only `paragraph` referenced `ToolConfig`; `bold`, `italic`, and `inline-link` declare no config type
- [x] 5.2 Confirm `yarn workspace <pkg> typecheck` and `yarn lint` pass for each of the four tools with no runtime behavior change

## 6. Verification and documentation alignment

- [x] 6.1 Confirm `yarn workspace @editorjs/sdk test`, `yarn workspace @editorjs/core test`, and `yarn lint` pass — 34 SDK tests, 161 core tests, lint clean
- [x] 6.2 Run `openspec validate --changes separate-tool-options-and-config --strict` and fix any delta-spec formatting issues
- [x] 6.3 Re-check `docs/plugins.md` and `docs/architecture.md` for statements about `static options` always being a plain object, and update any that no longer hold — neither file makes such a statement, no change needed
