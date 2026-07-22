## Why

Default tools, plugins, infra (DOM adapter, collaboration), and UI are currently hardcoded into `Core`'s constructor, so `@editorjs/core` cannot be consumed as a pure engine and there is no batteries-included package a v2 user can drop in. We want a `@editorjs/editorjs` package that composes core + defaults, and a `Core` that is a headless, tool-agnostic engine.

## What Changes

- **BREAKING** `Core` no longer registers any default tools, plugins, infra, or UI in its constructor. It becomes a headless engine that is non-functional until an adapter (and a default block tool) are registered by the caller.
- **BREAKING** `Core.initialize()` fails loudly: it throws synchronously when no rendering adapter is registered, and when the configured `defaultBlock` tool is not among the registered block tools; init failures are re-thrown instead of being swallowed by `console.error`.
- Introduce a new `@editorjs/editorjs` workspace package: a batteries-included entry point that wires `Core` + `DOMAdapters` + `CollaborationManager` + default tools (paragraph, bold, italic, link) + plugins (clipboard) + UI, auto-initializes in its constructor, and exposes an `isReady` promise.
- `@editorjs/editorjs` honors a v2-style `config.tools` map, merged on top of the defaults with override-by-name.
- `ShortcutsPlugin` remains in `@editorjs/core` (its relocation is handled by a separate change).
- Alias the existing npm `@editorjs/editorjs` v2 dependency to `editorjs-v2` (`npm:@editorjs/editorjs@…`) in `core`, `sdk`, `ui`, `tools/paragraph` to free the package name. Non-behavioral; import specifiers change only.
- Playground switches from wiring `Core` by hand to consuming `@editorjs/editorjs`.

## Capabilities

### New Capabilities
- `editorjs-bundle`: the `@editorjs/editorjs` batteries-included package — default tool/plugin/infra/UI composition over `Core`, constructor auto-initialization with an `isReady` promise, and v2-style `config.tools` merging with override-by-name.

### Modified Capabilities
- `core`: `Core` becomes headless — the constructor no longer registers default tools/plugins/infra; `initialize()` requires a caller-registered adapter and default block tool and fails loudly (throws) when they are missing.

## Impact

- New package: `packages/editorjs` (`@editorjs/editorjs`), added to `packages/*` workspaces.
- `@editorjs/core`: `src/index.ts` (remove hardcoded `use()` calls + fail-loud validation) and dropped dependencies (`bold`, `italic`, `inline-link`, `paragraph`, `clipboard-plugin`, `collaboration-manager`, `dom-adapters`). `src/plugins/ShortcutsPlugin.ts` stays in place (no longer auto-registered).
- Dependency rename to `editorjs-v2` across `core`, `sdk`, `ui`, `tools/paragraph` `package.json` + their `@editorjs/editorjs` import specifiers.
- `packages/playground` consumes `@editorjs/editorjs` instead of `@editorjs/core` directly.
- Supersedes the local plan at `~/.claude/plans/editorjs-bundle-package.md`. No `docs/` architecture doc currently describes core's default-tool loading, so none is contradicted; a follow-up doc update may note the new bundle package.
