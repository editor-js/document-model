## Context

Today a tool's static surface is one bag (`ToolConstructor.options`) that mixes two things with different audiences and different lifetimes:

- **Core/plugin-facing wiring** — `toolbox`, `shortcut`, `inlineToolbar`, `tunes`, `conversionConfig`, `canBeSplit`, `isReadOnlySupported`. Read by `BaseToolFacade`/`BlockToolFacade` getters and consumed by plugins (`ToolboxUI`, `ShortcutsPlugin`, inline toolbar, tunes) **before any block instance exists**.
- **Tool-author-facing user data** — `ToolConfig`, nested under `options.config`, merged with any `use()`-time `config` override in `BaseToolFacade.config`, and handed to the tool's `constructor`/`prepare()`.

`ToolConfig` itself is not an SDK contract — it's re-exported from the legacy `@editorjs/editorjs` package as `type ToolConfig<T extends object = any> = T`, an untyped passthrough. A tool author gets whatever structure they declare in their own `Config` generic parameter, with nothing checking that it's consistent with anything else.

The concrete failure this produces: a tool declares a config field intended to shape one of its static options — a set of variants that should become toolbox entries, a mode that should pick a shortcut — and the field is inert. `options` is evaluated once, statically, at class-definition time, while `config` is only resolved per tool-registration (in `BaseToolFacade.config`) and per block instance (in the constructor), so no option value can be a function of it. The field remains in the tool's `Config` type and in its documentation while the option keeps its hardcoded value.

Constraints this design has to respect:
- A page can run multiple `Core` instances that both `use()` the same tool class (e.g. two editors sharing one imported class). Anything a tool computes from its own resolved config must not be written onto the shared class/static object, or the second instance's config would clobber the first's.
- Every consumer of a tool's static options reads it through a **synchronous** getter (`BlockToolFacade.toolbox`, `isReadOnlySupported`, `conversionConfig`, `InlineToolFacade`'s option reads). Whatever produces those values must therefore be resolvable synchronously by the time the facade exists.
- Per this change's proposal, a breaking change to `ToolConfig`'s type/import and to the `static options` type is acceptable; a live "change config after mount" API is explicitly out of scope.
- The project's existing TDD convention applies to the facade changes below (see `openspec/config.yaml` rules).

## Goals / Non-Goals

**Goals:**
- Make `ToolConfig` an SDK-owned, real contract (not a re-exported `any`-defaulted passthrough).
- Keep `ToolOptions` (`BlockToolOptions`/`InlineToolOptions`/`BlockTuneOptions`) as the static, core/plugin-facing contract, formally distinct from `ToolConfig`.
- Let a tool derive its static options from its `ToolConfig` — without mutating the tool's shared static class property, and without adding a resolution step to the tool-registration lifecycle.
- Keep the change's blast radius inside the SDK: no new plumbing in `packages/core`.

**Non-Goals:**
- No live/reactive config updates after the editor has mounted (confirmed out of scope — config is resolved once, at facade construction).
- No change to `prepare()`. Async, side-effectful tool initialization keeps working exactly as it does today.
- No change to how `toolbox`, `shortcut`, `inlineToolbar`, or `tunes` are merged with `use()`-time overrides — the merge algorithm and its tiers stay as they are.
- No dev-time "declared but unused config key" diagnostic in this change (see Decision 8).
- Not migrating tools that live in their own repositories. This change ships the SDK mechanism; adopting the factory form is each tool's own follow-up.

## Decisions

**1. `ToolConfig` becomes an SDK-owned type, not a re-export of `@editorjs/editorjs`'s passthrough.**
The legacy `ToolConfig<T extends object = any> = T` is how the untyped-escape-hatch problem enters v3 in the first place — any tool author who doesn't explicitly parameterize their `Config` generic silently gets `any`. SDK defines its own `ToolConfig` base (still generic per tool, but anchored in `@editorjs/sdk` so it's the type the rest of this design's checks can hook into).
*Alternative considered*: leave the re-export and only tighten the `Config extends ToolConfig` bound on each interface (`BlockToolOptions`, etc.). Rejected — the default still resolves to `any` for any tool that skips the generic, which is exactly today's failure mode.

**2. `options` and `config` stay two separate top-level concepts; `options.config` remains the only bridge.**
This matches how they're actually consumed: `options` (via facade getters) is read by core/plugins before any block exists; `config` is read by the tool instance itself. Collapsing them into one `ToolSettings<Config>` bag would erase that timing distinction, which is the actual source of the bug.
*Alternative considered*: a single unified settings object passed everywhere. Rejected — every plugin consumer would need to filter out user-data noise, and it doesn't resolve the "when is this available" question.

**3. Config-derived options are expressed by letting `options` itself be a function of `config` — not by routing them through `prepare()`'s return value.**
`BaseToolConstructor.options` widens to:
```ts
type ToolOptionsFactory<Config extends ToolConfig, Options> = (config: Config) => Options;

options?: Options | ToolOptionsFactory<Config, Options>;
```
The two hooks answer different questions and have different natures. `prepare()` is *asynchronous, side-effectful initialization* — its v2 role is loading external resources before the tool can be used, and it is called for its effects, not its value. Deriving `toolbox` entries from `config.levels` is a *pure, synchronous* mapping over data the framework already holds. Merging the two conflates those natures, and a chain of machinery follows from the merge: because `prepare()` may be async, its result cannot be read by the synchronous option getters, so it must be resolved eagerly and cached behind a dedicated type and a facade slot, and that caching must in turn be sequenced by `ToolsManager` ahead of `ToolLoadedCoreEvent`. Keeping the derivation on `options` itself makes all of it unnecessary.
*Alternative considered*: widen `prepare()` to return a `PreparedToolOptions` object that the facade stores and its option getters consult. Rejected on the above; concretely it costs a new exported type, three new members on `BaseToolFacade` (a private field, a getter, a setter), capture-and-inject logic in `ToolsManager.prepareTools()`, an ordering guarantee relative to `ToolLoadedCoreEvent` that anyone touching that method must preserve, and an allow-list of derivable fields — starting at `toolbox` alone — that has to be widened by hand for every further field. The factory form derives the whole option object with none of it.
*Alternative considered*: a second static hook alongside `options`, e.g. `resolveOptions(config)`. Rejected — it keeps two declaration sites for one concept, which is the thing the review objected to; the union type on a single `options` member has one declaration site and one resolution site.

**4. The factory receives the `use()`-time config, and applies its own defaults inside its body.**
The argument is `useToolOptions.config ?? {}` — exactly the object an integrator passed to `core.use(Tool, { config })`. A tool applies its defaults where it derives from them:
```ts
static options = (config: MyToolConfig) => {
  const variants = config.variants ?? DEFAULT_VARIANTS;

  return {
    config: { variants, defaultVariant: config.defaultVariant ?? variants[0] },
    toolbox: variants.map(variant => ({ title: titleFor(variant), icon: ICONS[variant], data: { variant } })),
  };
};
```
`BaseToolFacade.config` then merges as it always has — `{ ...resolvedOptions.config, ...useToolOptions.config }` — so the tool *instance* still receives a config carrying the defaults, and the object form of `options` behaves byte-for-byte as it does today.
*Alternative considered*: pass the fully merged config (tool-side defaults ∪ `use()`-time override) into the factory, mirroring what `prepare()` receives today. Rejected as genuinely circular: the tool-side defaults live in `options.config`, which for a factory-form tool only exists in that factory's own return value, so building its input would require its output.
*Trade-off accepted*: for factory-form tools the framework no longer pre-merges `options.config` defaults *before* the derivation runs — the tool writes `?? default` itself. In exchange the defaults live in exactly one place in the tool's source, next to the code that consumes them, instead of being split between a static `options.config` block and the logic that reads it.

**5. The factory is synchronous.**
Every consumer of static options is a synchronous getter, so allowing a `Promise` return would reintroduce precisely the eager-resolve-and-cache problem Decision 3 removes: `ToolsManager` would again have to await the value and inject it before `ToolLoadedCoreEvent`, and the facade would again need a "not resolved yet" state. A tool that needs asynchronous work before it can operate still has `prepare()`; that work simply cannot feed the tool's static declaration.
*Alternative considered*: `options?: Options | ((config) => Options | Promise<Options>)`. Rejected — no evidenced case (nothing in-repo, and the derivations this targets are pure maps over config values), and it costs the entire simplification.

**6. The factory is resolved once, in the facade constructor, into a private per-instance field.**
`BaseToolFacade` computes `isFunction(constructable.options) ? constructable.options(useConfig) : (constructable.options ?? {})` at construction time and keeps the result in a private field. Every option-reading getter — `options` and `config` on `BaseToolFacade`, `toolbox` and `isReadOnlySupported` on `BlockToolFacade` — reads that field rather than `constructable.options`. Those four getters are the only places in the repo that read a tool class's static options directly, so the conversion is fully enumerable.
This makes the multi-`Core` constraint hold *by construction* rather than by mitigation: the factory is a pure function on the class, each facade calls it with its own `useToolOptions.config`, and nothing is ever written back to the shared `constructable`. Two `Core` instances using one imported tool class with different configs cannot interfere.
*Alternative considered*: resolve lazily and memoize on first read. Rejected as equivalent in effect but worse in failure mode — a throwing factory would surface at an arbitrary getter read rather than at tool registration.
*Alternative considered*: call the factory on every getter read. Rejected — a tool author would reasonably assume a single call, and repeated calls would make `toolbox` entry identity unstable across reads.

**7. `toolbox` resolution keeps its existing two tiers and its existing merge algorithm.**
`BlockToolFacade.toolbox` still resolves tool-side value, then the explicit `use()`-time override on top, with the same array/object positional-merge rules and the same `toolbox: false` hiding behavior. Only the *source* of the tool-side value changes, from `constructable.options.toolbox` to the resolved static options. The factory result replaces what the static object would have been; it is not an extra layer.
*Alternative considered*: a third tier, in which a separately-derived toolbox value takes precedence over the static one before the `use()` override is applied on top (`derived ?? static`, then `use()`). Rejected with Decision 3 — a third tier is only needed when derivation arrives through a channel *alongside* `options`; when the factory *is* `options`, there is nothing left to layer.

**8. Detecting a declared-but-unused config key is out of scope for this change.**
A tempting companion feature is a dev-time warning when a tool declares a `ToolConfig` key that nothing ever reads — an inert field would then announce itself instead of failing silently. The obvious implementation, wrapping the resolved config in a `Proxy` that records key access during tool registration, does not survive contact with the lifecycle: the only registration-time hook a tool exposes is `prepare()`, which most tools — including all four in-repo ones — do not define at all, so the check would never run for them; and a key read in the tool's *constructor* happens per block instance, after any registration-time observation window has closed, so it would be reported as unused. Getting this right needs a reachability model — a decision about what "used" means — that this change does not otherwise require, and the bug is fixed by making the field *derivable*, not by warning about it.
*Alternative considered*: keep it and fix it in place (run for all tools, treat any config read as use). Rejected as scope creep onto a contract change — it needs its own design discussion about the reachability model.

**9. Tools that keep the object form of `options` are unaffected at runtime.**
`bold`, `italic`, `inline-link`, and `paragraph` all declare `static readonly options = { ... }` and none needs config-derived options; their migration is limited to importing the new SDK-owned `ToolConfig` type. The union type is additive — the object branch is the existing behavior.

## Risks / Trade-offs

- **[Risk]** `options` becoming a union (object or factory) means any code reading it must narrow first, and a tool's static options can no longer be inspected without invoking the factory. → **Mitigation**: resolution is centralized in one place (the `BaseToolFacade` constructor) and the 5 existing read sites are converted to read the resolved field; the facade is the sanctioned read path for everything outside the tool itself, and there is no in-repo consumer that reads `Tool.options` directly off a class.
- **[Risk]** For factory-form tools the framework no longer merges `options.config` defaults into the value handed to the derivation, so a tool author who forgets a `?? default` gets `undefined` where the object form would have given them a default. → **Mitigation**: the factory's `config` parameter is typed as the tool's own `Config`, so the optionality is visible at the call site; and the defaults the factory returns under `config` still flow to the tool instance through the unchanged `BaseToolFacade.config` merge.
- **[Risk]** Sync-only factories mean a genuinely async-derived option (e.g. a toolbox built from a fetched preset list) is not expressible. → **Mitigation**: no such case exists in-repo or in the motivating PR; if one appears, revisiting Decision 5 is a contained change (the facade would need a resolved/unresolved state and `ToolsManager` an await point) rather than a redesign.

## Migration Plan

- Ship the SDK contract changes (`ToolConfig`, the widened `options` type) and the facade resolution together — they are tightly coupled; a partial rollout would leave the factory form declared in the types with no resolver behind it.
- Update the four in-repo tools' `Config` type imports (mechanical, type-only, no runtime behavior change).
- No feature flag or staged rollout: this is a pre-1.0 internal SDK surface, and per this change's confirmed scope a breaking change is acceptable with no external in-repo consumers beyond the tools already covered.
- Rollback: revert the SDK/facade commits together; the tools' type-only import changes revert cleanly since they carry no runtime behavior.

## Open Questions

- Should the factory also receive `toolName`, as `prepare()` does (`(config, toolName) => Options` or an object argument)? Leaning no — no evidenced need, and a single positional `config` argument keeps the signature readable; the object-argument form is the escape hatch if a second input ever appears.
- `BlockToolFacade.isReadOnlySupported` reads the tool-side options only, so a `use()`-time override cannot enable/disable it. This change relocates that read to the resolved static options but preserves the behavior. Whether it *should* honor a `use()` override is a separate question, deliberately not answered here.
- Should "unused config key" detection (Decision 8) become its own proposal, and if so, what counts as a key being used — read by the options factory, by `prepare()`, or by the tool's constructor? The constructor case is the hard one, since it is per block instance rather than per registration.
- How would a third-party plugin (i.e. not one of the framework's own Toolbox/Shortcuts/InlineToolbar/Tunes consumers) read its own config-derived data off a tool? `BlockToolOptions`/`InlineToolOptions`/`BlockTuneOptions` already carry a `[key: string]: unknown` escape hatch for custom static fields, and the factory form derives those alongside everything else — so this is arguably now answered, but no third-party case has been tested against it.
