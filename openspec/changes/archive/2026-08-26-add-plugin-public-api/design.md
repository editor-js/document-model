## Context

Plugins are registered with `core.use(PluginCtor)`, instantiated in `Core.#initializePlugin()` with `{ config, api, eventBus }`, and then dropped — `Core` keeps no reference to the instance. Communication is one-way: plugins listen on the `EventBus` and push through `EditorAPI`. Nothing can call *into* a plugin.

The one existing case of a tool configuring a plugin is `ShortcutsPlugin`, which reads `tool.options['shortcut']` off a `BlockToolOptions` whose `[key: string]: unknown` index signature makes any key legal and none checked. That escape hatch is the de-facto extension point today, and it does not scale past one plugin: two plugins wanting a `shortcut` key would silently fight, and neither can express what shape it expects.

This change adds the two missing directions — plugin → outside world (public API) and tool → plugin (namespaced options) — with one shared identity (`name`) and one shared typing technique (declaration merging), so the two features stay symmetric rather than becoming two unrelated mechanisms.

Supersedes parts of `docs/plugins.md` (Registration, EditorAPI, Lifecycle boundary) and extends `docs/diagrams/plugin-lifecycle-flow.mmd`.

## Goals / Non-Goals

**Goals:**
- A plugin can expose a callable public API reachable by the integrator and by other plugins.
- A tool can declare configuration addressed to a specific plugin, and the plugin can read only its own slice.
- Both are type-safe end to end with no casts at any call site, and generic — nothing in `sdk` or `core` knows the name `shortcuts`.
- `ShortcutsPlugin` and the built-in inline tools migrate onto the new mechanism, proving it on a real case.

**Non-Goals:**
- A plugin lifecycle beyond construction (no `onReady`/`onDestroy` hooks, no `Core.destroy()`). Registry teardown hangs off the existing `destroy()` contract only.
- Cross-plugin API access *during* plugin construction. The contract is "after `core:ready`".
- Runtime validation of plugin option slices against a schema — typing is compile-time; a plugin validates its own slice if it wants to.
- Versioning or capability negotiation between plugin APIs.
- Deep-merging tool option slices.

## Decisions

### 1. `name` as the single key for both features

Every plugin constructor declares `static readonly name = 'shortcuts'` (no type annotation, so TS infers the literal type). That literal keys the runtime registry, `api.plugins`, and `options.plugins`. `name` is chosen over a dedicated `pluginId` so plugins and tools share one convention — `BaseToolConstructor` already identifies tools by a static `name`.

**Interaction with `Function.name`.** Every class already has a static `name` typed `string`, so `name` is the one identifier that cannot be *required* by the type system: a plugin that forgets to declare it still satisfies `{ name: string }` and silently registers under its class name — which a production build will have minified to `t`. This mirrors the documented tool behavior ("falls back to the JavaScript class name if not explicitly set"), so the fallback is consistent, but it is a real hole where a `pluginId` would have produced a compile error. Two mitigations, both cheap, both applied:

- The `use()` overload constrains `Id extends PluginId` (decision 3). A plugin exposing a `publicApi` or accepting tool options must have a `name` that is a *key of one of the maps*; a bare `string` from `Function.name` does not narrow to a key, so those plugins fail to compile without an explicit declaration. Only plugins that augment neither map — which have nothing to key — can fall through to the class name.
- `PluginRegistry.register()` rejects a name that is absent from a small runtime allowlist check: it throws when the name is empty or when it duplicates an existing entry, which is the observable symptom of two minified classes colliding.

*Alternative rejected:* a dedicated `pluginId` property. It is strictly safer — no `Function.name` shadow, so a missing declaration is always a compile error — but it introduces a second identity convention alongside tools' `name` for no gain the mitigations above do not already cover.

*Alternative rejected:* using the constructor itself as the key (`api.plugins.get(ShortcutsPlugin)`). It avoids a global name space and collisions, but forces every call site — including tool option declarations, which are static object literals — to import the plugin class. That is the wrong trade for tool config, and having two different keying schemes for the two features defeats the symmetry.

*Alternative rejected:* `unique symbol` ids. They give collision-proof keys usable as computed properties, but symbols cannot be serialized into a plain-JSON-ish `options` object and are awkward to inspect while debugging.

### 2. Two augmentable interfaces in `@editorjs/sdk`

```ts
// sdk
export interface EditorjsPluginApiMap {}   // name -> public API type
export interface ToolPluginOptionsMap {}   // name -> tool-directed options type

export type PluginsAPI = Partial<EditorjsPluginApiMap>;
export type ToolPluginOptions = Partial<ToolPluginOptionsMap>;
```

A plugin package augments both from its own entry point:

```ts
// @editorjs/shortcuts (or core/src/plugins/ShortcutsPlugin.ts today)
declare module '@editorjs/sdk' {
  interface EditorjsPluginApiMap { shortcuts: ShortcutsPluginApi; }
  interface ToolPluginOptionsMap { shortcuts: ShortcutsToolOptions; }
}
```

`Partial<>` is what makes "known key → typed, unknown key → compile error, present key → possibly `undefined`" all fall out for free. Empty base interfaces mean `sdk` compiles standalone with zero permitted keys, which is the correct default.

*Alternative rejected:* keeping `[key: string]: unknown` and layering runtime schema validation. It never produces call-site inference, which is the whole ask.

### 3. Binding `name` to the augmented key at registration

TypeScript does not check statics through `implements`, so a plugin could declare `name = 'shortcut'` while augmenting the map under `shortcuts`. The check is placed on `core.use()` instead of requiring boilerplate in every plugin package:

```ts
export interface EditorjsPlugin<Id extends PluginId = PluginId> {
  destroy?(): void;
  publicApi?: Id extends keyof EditorjsPluginApiMap ? EditorjsPluginApiMap[Id] : never;
}

export interface EditorjsPluginConstructor<
  Id extends PluginId = PluginId,
  Instance extends EditorjsPlugin<Id> = EditorjsPlugin<Id>
> {
  new (params: EditorjsPluginParams): Instance;
  type: EntityType;
  name: Id;
}

// Core
public use<Id extends PluginId>(plugin: EditorjsPluginConstructor<Id>): Core;
```

`Id` is inferred from the `name` literal; the instance's `publicApi` is then checked against `EditorjsPluginApiMap[Id]`. A drifted id fails at the `use()` call — the one place every plugin passes through.

`PluginId = keyof EditorjsPluginApiMap | keyof ToolPluginOptionsMap | (string & {})`: the `string & {}` arm keeps ids legal for plugins that augment neither map (they have no public API and take no tool config) while preserving literal-type inference and autocomplete for the known ids.

Because `name` is shadowed by `Function.name` (decision 1), that `string & {}` arm is also what a forgotten declaration falls into. The conditional in `EditorjsPlugin` is what closes the gap: when `Id` widens to `string`, `Id extends keyof EditorjsPluginApiMap` is false, so `publicApi` resolves to `never` — a plugin that actually declares one gets "Type `ShortcutsPluginApi` is not assignable to type `never`" at the `use()` site, which is the diagnostic pointing at the missing `static readonly name`. The same holds for the options side via `pluginOptions()`, whose `Id` parameter is constrained to `keyof ToolPluginOptionsMap` with no `string` arm at all.

### 4. `api.plugins` is a live record, not a snapshot

Plugins are constructed sequentially and each receives `EditorAPI` in its constructor, so a plugin constructed first would capture an incomplete registry if `plugins` were copied. Instead one mutable record object is created before any plugin is instantiated and shared by reference; `PluginRegistry` (core-internal) writes into it as each plugin is constructed.

```ts
class PluginRegistry {
  readonly #record: Record<string, unknown> = {};
  public get api(): PluginsAPI;                    // the shared record
  public register(id: string, publicApi: unknown): void;  // throws on duplicate id
  public unregister(id: string): void;
}
```

`EditorAPI.plugins` is a getter delegating to `registry.api`, so no IoC binding-order constraint appears. Because consumers read `api.plugins.x` at call time (inside an event handler, after `ready`), late writes are visible.

*Alternative rejected:* a `Proxy` over a `Map`. Equivalent behavior, but it breaks `in`/spread/devtools inspection and needs a cast to the mapped type anyway.

Duplicate-id detection lives in `register()` and throws — currently `Core.initialize()` wraps everything in a try/catch that only `console.error`s, so the failure surfaces there; tightening that is out of scope.

### 5. Public API is a declared member, read once after construction

The plugin exposes `public readonly publicApi: ShortcutsPluginApi` (or a getter). `Core.#initializePlugin()` reads it right after `new plugin(...)` and calls `registry.register(Ctor.name, instance.publicApi)` when it is not `undefined`. Reading once keeps the "same object for every consumer" guarantee from the spec, so a plugin API may hold state.

Named `publicApi`, not `api` — plugins already hold `#api: EditorAPI`, and reusing the name would read as the editor API on both sides of the boundary.

### 6. Tool options: `plugins` key merged per id

```ts
export interface BaseToolOptions<Config extends ToolConfig = ToolConfig> {
  config?: Config;
  plugins?: ToolPluginOptions;
}
```

`BaseToolFacade` gains:

```ts
public pluginOptions<Id extends keyof ToolPluginOptionsMap>(id: Id): ToolPluginOptionsMap[Id] | undefined;
```

Merge rule: **shallow at the id level** — `{ ...staticOptions.plugins, ...useOptions.plugins }`. Disjoint ids from both sources survive; when both supply the same id, the `use()` slice replaces the static one wholesale. No deep merge inside a slice: it matches the precedence users already see for `options`, and a deep merge would make it impossible for an integrator to *remove* a key a tool declared. The existing `options` getter is updated to apply the same per-id merge to `plugins`, so `facade.options.plugins` and `facade.pluginOptions(id)` never disagree.

### 7. ShortcutsPlugin as the proving case

```ts
interface ShortcutsToolOptions { shortcut?: string; }

interface ShortcutsPluginApi {
  register(shortcut: string, handler: (event: KeyboardEvent) => void): void;
  unregister(shortcut: string): void;
}
```

Tool-declared shortcuts are registered through the same internal path as API-registered ones, so there is a single lookup table and one precedence rule. On `ToolLoadedCoreEvent` the plugin calls `facade.pluginOptions('shortcuts')` and, when a `shortcut` is present, registers a handler applying that inline tool. The existing `#processBlockTool`/`#processBlockTune` `@todo` stubs stay as-is; the `shortcuts` map for block tools becomes a natural extension of `ShortcutsToolOptions` later.

`bold`, `italic`, and `inline-link` move `shortcut: 'CMD+B'` → `plugins: { shortcuts: { shortcut: 'CMD+B' } }`.

`ShortcutsPlugin` lives in `packages/core/src/plugins/`, so its module augmentation ships from `@editorjs/core`. That is acceptable while it is a built-in; extracting it to `packages/plugins/shortcuts` (as `inline-link` and `clipboard-plugin` were extracted) is a follow-up, and the augmentation moves with it unchanged.

## Risks / Trade-offs

- **Global type namespace vs. per-instance runtime registry** → `EditorjsPluginApiMap` is global to a compilation, but the registry is per `Core` instance. Types will claim `api.plugins.shortcuts` exists on an editor that never registered the plugin. Mitigated by `Partial<>` making every entry `| undefined`, forcing `?.` at call sites; documented explicitly in `docs/plugins.md`.
- **Augmentation only applies if the plugin's types are in the compilation** → a plugin loaded purely at runtime gives no keys and the access fails to compile. Mitigated by requiring plugin packages to export their augmentation from the package entry point, so a plain `import '@editorjs/shortcuts'` is enough.
- **Plugin id collisions across the ecosystem** → a single flat namespace. Mitigated by the runtime duplicate check throwing at registration, so collisions are loud rather than silent; naming guidance goes in `docs/plugins.md`.
- **Cross-plugin access during construction returns `undefined`** → a plugin reaching for another's API in its constructor gets `undefined` with no diagnostic. Mitigated by documenting the "after `core:ready`" contract; a proper two-phase plugin lifecycle is the real fix and is deliberately deferred.
- **BREAKING: flat `options.shortcut` stops working** → third-party tools declaring it silently lose their shortcut. The `[key: string]: unknown` index signature means TypeScript cannot flag the old key. Mitigated by the migration note below; a deprecation shim reading the legacy key was considered and rejected as it would keep the untyped path alive and undermine the point of the change.
- **BREAKING: `name` required on every plugin constructor** → a compile error for any third-party plugin that exposes a `publicApi` or accepts tool options, which is the desired failure mode. A plugin doing neither silently inherits `Function.name` instead; see decision 1 for why that is accepted and what catches it at runtime.
- **Minified class names as registry keys** → a plugin that omits `name` and augments neither map registers under a mangled identifier, and two such plugins can collide non-deterministically across builds. Mitigated by the duplicate-name throw in `PluginRegistry.register()` and by documenting the explicit declaration as mandatory in `docs/plugins.md`.

## Migration Plan

1. Land the `sdk` contracts first — they are additive except for `name`, which every in-repo plugin gains in the same commit (`ShortcutsPlugin`, `ClipboardPlugin`, `DOMAdapters`, `CollaborationManager`).
2. Land the core registry and `api.plugins`; nothing reads it yet, so it is inert.
3. Migrate `ShortcutsPlugin` and the three built-in inline tools to `options.plugins.shortcuts` in one commit — the flat key stops being read at that point.
4. Update `docs/plugins.md` and `docs/diagrams/plugin-lifecycle-flow.mmd`.

Consumer migration is mechanical: add `static readonly name` to plugin classes; move `shortcut: 'X'` under `plugins: { shortcuts: { shortcut: 'X' } }` in tool options or in the `use()` argument.

Rollback: steps 2–3 revert independently of step 1; the `sdk` additions are inert without a registry.

## Open Questions

- Should `Core` expose the plugin registry on the instance itself (`editor.plugins`) in addition to `api.plugins`, for integrators who never touch `EditorAPI`? Deferred until the `@editorjs/editorjs` bundle package settles its public surface.
- Should `PluginRegistry` gate what a plugin may register (e.g. freezing the API object) to stop plugins from mutating each other's surfaces? Not needed for the first cut.
