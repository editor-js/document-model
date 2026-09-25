# Plugins & Tools

## Package boundary

Tools and plugins should only depend on `@editorjs/sdk` — never on `@editorjs/model` or `@editorjs/model-types` directly. `sdk` re-exports every type a tool/plugin author needs (`Index`, event classes, `BlockTool`/`InlineTool`/`BlockTune` contracts, etc.); `model` is the engine implementation that `core` and `ot-server` orchestrate, and `model-types` is an internal foundation shared only by `model` and `sdk`. Neither is part of the stable, tool-facing API.

## Registration

`core.use(...)` registers UI components/plugins by static `type` (values from `ToolType` for tools, `PluginType.Adapter` for adapters, and `PluginType.Plugin` for general plugins).

Every plugin must also declare a static `name` — its id across the editor. It keys the runtime registry behind `api.plugins` **and** the compile-time type maps:

```ts
export class ShortcutsPlugin implements EditorjsPlugin<'shortcuts'> {
  public static readonly type = PluginType.Plugin;
  public static readonly name = 'shortcuts';
}
```

Declare it as `public static readonly name = '…'` with no type annotation, so TypeScript infers the literal. Note that every class already inherits `name: string` from `Function`, so omitting the declaration does **not** fail on its own — the plugin silently registers under its class name, which a production build minifies. It does fail as soon as the plugin exposes a `publicApi`: the id widens to `string`, `publicApi` resolves to `never`, and `core.use()` rejects it.

Tools are registered via `core.use(ToolConstructor, options)` during setup. The `tools` config field provides tool settings/options that `ToolsManager` applies during `initialize()`.

| Type | Interface / Source | Purpose |
|---|---|---|
| UI Plugin | `EditorjsPlugin` | UI component/behavior registered via `core.use(...)` |
| Block Tool | `BlockTool` (from config `tools`) | Block rendering and block-specific behavior |
| Inline Tool | `InlineTool` (from config `tools`) | Selection formatting actions |
| Block Tune | `BlockTune` (from config `tools`) | Per-block tune behavior |

## Initialization sequence

Canonical startup order:

1. Initialize the adapter (`DOMAdapters` / `PluginType.Adapter`).
2. Instantiate registered UI plugins.
3. Prepare tools and emit `ToolLoadedCoreEvent` for each available tool.
4. Resolve `SelectionManager`, `BlocksManager`, and `BlockRenderer`. `BlockRenderer` subscribes to model block events and creates `BlockToolAdapter` instances per block when a `BlockAddedEvent` fires.
5. Initialize model with configured blocks (triggers `BlockAddedEvent` for each block).
6. Connect collaboration manager.

## Lifecycle boundary

- Plugins receive dependencies via constructor params (`config`, `api`, `eventBus`).
- Plugin instances may implement `destroy()`, but `Core` currently does not expose a global `destroy()` lifecycle hook.
- Plugins are constructed in registration order, and `api.plugins` is populated as each one is constructed. **Reading another plugin's API inside your constructor returns `undefined`** — do it after `core:ready`, or lazily inside an event handler. `api.plugins` resolves entries at access time, so a plugin constructed first still sees one registered later.

## Keyboard input

`BlocksUI` delegates every native `keydown` on the blocks holder as a `KeydownUIEvent` before doing anything with the key itself. A plugin that handles a key calls `preventDefault()` on the native event; `BlocksUI` sees that and skips its own handling, so plugin shortcuts take precedence over the built-in undo/redo bindings.

## Plugin public APIs

A plugin exposes callable surface by declaring `publicApi`; `Core` registers it under the plugin's `name` and serves it from `api.plugins`:

```ts
export interface ShortcutsPluginApi {
  register(shortcut: string, handler: (event: KeyboardEvent) => void): void;
  unregister(shortcut: string): void;
}

declare module '@editorjs/sdk' {
  interface EditorjsPluginApiMap {
    shortcuts: ShortcutsPluginApi;
  }
}

export class ShortcutsPlugin implements EditorjsPlugin<'shortcuts'> {
  public static readonly name = 'shortcuts';
  public readonly publicApi: ShortcutsPluginApi = { /* … */ };
}
```

Consumers — the integrator or another plugin — then call it with full inference and no imports at the call site:

```ts
api.plugins.shortcuts?.register('CMD+K', openSearch);
```

Plugin names share one flat namespace: registering two plugins under the same name throws at
initialization rather than silently overwriting. See [TypeScript caveats](#typescript-caveats)
for what the compiler does and does not check.

## Tool → plugin configuration

Tools address configuration to a plugin under `options.plugins.<name>`, typed by the `ToolPluginOptionsMap` augmentation:

```ts
declare module '@editorjs/sdk' {
  interface ToolPluginOptionsMap {
    shortcuts: { shortcut?: string };
  }
}

export class BoldInlineTool implements InlineTool {
  public static readonly options = {
    title: 'Bold',
    plugins: {
      shortcuts: { shortcut: 'CMD+B' },
    },
  };
}
```

The same key works in the second argument of `use()`, and the integrator's value wins:

```ts
core.use(BoldInlineTool, { plugins: { shortcuts: { shortcut: 'CMD+SHIFT+B' } } });
```

Merging is shallow **at the plugin-id level**: a slice supplied through `use()` replaces the tool's static slice for that id wholesale (so an integrator can drop a key the tool declared), while ids present in only one source are preserved. A plugin reads only its own slice:

```ts
const { shortcut } = toolFacade.pluginOptions('shortcuts') ?? {};
```

## TypeScript caveats

Both features — calling a plugin API and configuring a plugin from a tool — are typed the same
way: `@editorjs/sdk` declares two empty interfaces (`EditorjsPluginApiMap`, `ToolPluginOptionsMap`)
and each plugin package fills in its own row via module augmentation. That gives inference with no
casts, but it comes with rules worth knowing before you hit them.

### The augmentation must be in *your* compilation

A row exists only for programs that include the declaring file. If your program does not, the map
is empty there and `api.plugins.shortcuts` simply does not compile.

Three import forms work. None produces a runtime import, so a `devDependency` is enough — the
two `import type` forms vanish from the emitted JS entirely, and the directive survives only as a
comment:

```ts
import type {} from '@editorjs/shortcuts';                      // augmentation only
import type { ShortcutsPluginApi } from '@editorjs/shortcuts';  // when you name the type
/// <reference types="@editorjs/shortcuts" />                   // no import statement
```

Prefer the empty-import or `reference` form when you only need `api.plugins.x` to typecheck — an
unused named import invites someone to "clean it up" and silently break the typing.

If the type appears in your **own** public API (a return type, a public field), it leaks into your
`.d.ts` and downstream consumers need the package too — then it must be a real `dependency`.

### The plugin package must expose its augmentation from its entry point

`import type {} from '@editorjs/some-plugin'` only pulls in what the package's `types` entry
reaches. A plugin whose augmentation lives in a module the entry never re-exports is invisible,
and a deep import (`@editorjs/core/dist/plugins/ShortcutsPlugin.js`) is the only way in — not
something to ship. Plugin packages should `export` the plugin class and its API/options types
from `src/index.ts`.

> `ShortcutsPlugin` currently lives inside `@editorjs/core` and is **not** re-exported, so its
> types are not reachable by any consumer. It also cannot be reached from packages `core` itself
> depends on (`dom-adapters`, `ui`) — that would be a dependency cycle. Extracting it to
> `packages/plugins/shortcuts` (deps: `sdk` only), the way `clipboard-plugin` and `inline-link`
> were extracted, is the fix.

### The type map is global; the registry is per editor instance

`EditorjsPluginApiMap` is global to a compilation, but `PluginRegistry` is per `Core`. Types will
claim `api.plugins.shortcuts` exists on an editor that never registered the plugin. That is why
every entry is optional — **always use `?.`**, and treat `undefined` as "not installed" rather
than an error:

```ts
api.plugins.shortcuts?.register('CMD+K', openSearch);
```

### A tool's `static options` is not checked where it is written

This one surprises people. Adding a nonsense plugin id to a tool produces **no error**:

```ts
public static readonly options = {
  plugins: {
    totallyMadeUpPlugin: { whatever: 123 },  // compiles fine 🙁
  },
};
```

Two reasons, and both must be fixed for the check to fire:

1. **No contextual type.** `static readonly options = {…}` is an unannotated object literal.
   TypeScript excess-property-checks a *fresh literal against a target type*; here there is no
   target, so nothing is compared.
2. **An empty map accepts everything.** A tool package that depends only on `@editorjs/sdk` sees
   no augmentations, so `ToolPluginOptionsMap` is `{}` and `Partial<{}>` permits any key.

Passing the class to `core.use(Tool)` does not catch it either: that is a type-to-type
assignability check, and extra properties are legal in structural assignability. What **is**
checked is the second argument, because that one is a fresh literal:

```ts
core.use(BoldInlineTool, { plugins: { nope: {} } });
// ✅ Object literal may only specify known properties, and 'nope' does not exist
//    in type 'Partial<ToolPluginOptionsMap>'
```

### Opting in to full checking on a tool

To get keys *and* value types checked where you write them, add `satisfies` **and** depend on the
types of the plugin you are configuring:

```ts
import type {} from '@editorjs/shortcuts';
import type { InlineToolOptions } from '@editorjs/sdk';

export class BoldInlineTool implements InlineTool {
  public static readonly options = {
    title: 'Bold',
    plugins: {
      shortcuts: { shortcut: 'CMD+B' },
    },
  } satisfies InlineToolOptions;
}
```

Now a typo or a wrong value type fails at the declaration:

```
error TS2353: Object literal may only specify known properties,
and 'totallyMadeUpPlugin' does not exist in type 'Partial<ToolPluginOptionsMap>'.
```

`satisfies` keeps the literal type (unlike a type annotation), so nothing is widened. The cost is
that the tool package now depends on the plugin package for types. That is a real coupling
decision: it is reasonable for a tool that ships opinionated defaults for a plugin, and
unreasonable for a tool that just happens to mention one.

### Why the framework does not enforce this for you

An automatic check at `core.use()` was prototyped and rejected. A conditional type can reject
plugin ids absent from `ToolPluginOptionsMap`, and it does catch real typos — but TypeScript
cannot distinguish *"this id is a typo"* from *"this id's package is not imported here"*. Both
look like a missing key. The result was a false positive on valid code: registering
`BoldInlineTool` from a package without the `shortcuts` augmentation failed with
`'options.plugins addresses an unknown plugin': "shortcuts"`, even though bold's configuration is
correct and harmless at runtime.

That failure mode gets worse, not better, as tool and plugin registration moves out of `core` into
separate packages: the check resolves against whatever the *calling* package imports, so an
assembling package would be forced to import the types of every plugin any of its tools mentions.
Since an unknown slice is simply ignored at runtime, opt-in `satisfies` is the sound trade.

## Migration

Two breaking changes came with the plugin public API work:

- **`options.shortcut` is no longer read.** `ShortcutsPlugin` now sources shortcuts only from `options.plugins.shortcuts`. Move `shortcut: 'CMD+B'` under `plugins: { shortcuts: { shortcut: 'CMD+B' } }`, in the tool's `static options` or in the `use()` argument. The old flat key still type-checks (tool options carry an index signature), so it fails silently — grep for it.
- **Plugin constructors need a static `name`.** Add `public static readonly name = 'my-plugin'`. Omitting it is a compile error only for plugins that expose a `publicApi` or accept tool options; other plugins fall back to the (minifiable) class name, so declare it regardless.

## EditorAPI

Every plugin and tool receives an `api` object of type `EditorAPI` in its constructor. It is composed of these namespaces:

### `api.blocks`

Programmatic block management — delegates to `BlocksManager`.

| Method | Description |
|---|---|
| `insert(type?, data?, index?, id?, focus?, replace?)` | Insert a block of the given tool type |
| `insertMany(blocks, index?)` | Insert multiple serialised blocks |
| `delete(index?)` | Remove a block (defaults to caret block) |
| `move(toIndex, fromIndex?)` | Move a block to a new position |
| `render(document)` | Re-initialize the document from serialised data |
| `clear()` | Remove all blocks |
| `getBlocksCount()` | Return the total number of blocks |

### `api.selection`

Inline tool application — delegates to `SelectionManager`.

| Method | Description |
|---|---|
| `applyInlineToolForCurrentSelection(toolName, data?)` | Apply or toggle an inline tool on the current caret selection |

### `api.document`

Document access and mutations — delegates to `DocumentAPI`.

| Method | Description |
|---|---|
| `data` | Returns `EditorDocumentSerialized` — the current serialised document state |
| `insertData(params)` | Insert data at the specified index |
| `removeData(params)` | Remove data at the specified index |
| `modifyData(params)` | Modify data at the specified index |
| `undo()` | Undo the last change in the document (dispatches `UndoCoreEvent`) |
| `redo()` | Redo the last undone change (dispatches `RedoCoreEvent`) |

### `api.plugins`

Public APIs exposed by the registered plugins, keyed by plugin `name` — see [Plugin public APIs](#plugin-public-apis). Backed by `PluginRegistry`; every entry is optional.

→ [`diagrams/plugin-lifecycle-flow.mmd`](diagrams/plugin-lifecycle-flow.mmd)

_`new Core` wires services; `use()` registers UI plugins; `initialize()` prepares tools, initializes document, and starts collaboration._
