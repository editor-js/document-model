## Why

Tools expose two static surfaces with no formal separation: `static options` (core/plugin-facing wiring — `toolbox`, `shortcut`, `inlineToolbar`, `tunes`, `conversionConfig`, `canBeSplit`) and `ToolConfig` (plugin-specific user data, typed only via a generic `Config extends ToolConfig = any` re-exported from the legacy `@editorjs/editorjs` package, where `ToolConfig<T extends object = any> = T` is an untyped passthrough). Because `options` is a plain static value evaluated once at class-definition time, a tool has no way to express "these option values are derived from my resolved config" — there is no contract connecting a `ToolConfig` field to the `options` it is meant to drive.

The gap is structural rather than stylistic. `options` is read off the class before any registration exists, while `config` is resolved per tool registration (in `BaseToolFacade.config`) and per block instance (in the tool's constructor). A config field meant to drive an option value — toolbox entries following a set of variants, a shortcut depending on a mode, conversion behavior gated by a flag — has no path to it. The field stays declared in the tool's `Config` type and documented for integrators, while the option it was meant to control keeps whatever the class hardcoded, and nothing reports the mismatch.

## What Changes

- Define `ToolConfig` as an SDK-owned, per-tool-type-parameterized contract, replacing the untyped passthrough currently imported from `@editorjs/editorjs`. **BREAKING**: a tool's `Config` generic must conform to the new contract's shape and import path.
- Allow a tool's static `options` to be, in addition to a plain object, a **synchronous factory** `(config: ToolConfig) => ToolOptions`. The factory receives the `config` supplied at `use(Tool, { config })` time and returns the tool's complete static option set — including any config defaults it applies, under `options.config`, exactly as the object form declares them. **BREAKING** for the `static options` type of every tool.
- Resolve that factory exactly once, when the tool's facade is constructed, into a private per-facade field. Every option-reading getter (`options`, `config`, `toolbox`, `isReadOnlySupported`) reads the resolved value instead of `constructable.options`, so nothing is ever written back onto the shared tool class.
- Explicitly **do not** change `prepare()`. It stays the `void`-returning, optionally-async, side-effectful initialization hook it is today; deriving static options from config is a separate, pure, synchronous concern and is not routed through it.
- Migrate the four in-repo tools (`paragraph`, `bold`, `italic`, `inline-link`) to the new `ToolConfig`/`ToolOptions` contracts. All four keep the plain-object form of `options`; none needs config-derived options.
- Out of scope: changing a tool's config after the editor has already mounted (no live/reactive "hot-swap" API). Config is resolved once, during tool registration, before the editor renders its UI.
- Out of scope: dev-time detection of a declared-but-unused `ToolConfig` key. It is a distinct diagnostics concern with its own open question (what counts as "used" — a key read in a factory, in `prepare()`, or in the tool's constructor?) and does not belong in the contract change.

## Capabilities

### New Capabilities
(none — this reshapes the existing tool-contract behavior rather than introducing a new capability area)

### Modified Capabilities
- `sdk`: the "Tool and tune contracts" requirement changes — `ToolConfig` becomes a dedicated SDK contract (no longer a passthrough re-export), and `BaseToolConstructor.options` widens from a plain object to "a plain object **or** a synchronous factory of the resolved config", with the facade owning a single resolution of that factory per registration.

## Impact

- `packages/sdk/src/entities/{BaseTool.ts, BlockTool.ts, InlineTool.ts, BlockTune.ts}`: SDK-owned `ToolConfig`; `options` widened to accept a config factory. `prepare()`'s signature is unchanged.
- `packages/sdk/src/tools/facades/BaseToolFacade.ts`: a private per-instance field holding the resolved static options, populated in the constructor; the `options` and `config` getters read it instead of `constructable.options`.
- `packages/sdk/src/tools/facades/BlockToolFacade.ts`: the `toolbox` and `isReadOnlySupported` getters read the resolved static options. The `toolbox` merge algorithm and its two tiers (tool-side value, then `use()`-time override) are unchanged.
- `packages/core/src/tools/ToolsManager.ts`: unchanged. Resolution happens entirely inside the SDK facade, so the tool-registration lifecycle gains no new step and no new ordering guarantee.
- `packages/tools/{paragraph,bold,italic,inline-link}`: migrate to the new `ToolConfig` import/contract (type-only change; all keep object-form `options`).
- `openspec/specs/sdk/spec.md`: delta spec updates to the "Tool and tune contracts" requirement.
