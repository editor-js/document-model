## Context

`@editorjs/core`'s constructor hardcodes eight `use()` calls (`packages/core/src/index.ts:113–120`): default block/inline tools (`Paragraph`, `BoldInlineTool`, `ItalicInlineTool`, `LinkInlineTool`), plugins (`ShortcutsPlugin`, `ClipboardPlugin`), and infra (`CollaborationManager`, `DOMAdapters`). This makes core impossible to consume as a headless engine and means there is no batteries-included package for v2 users.

Two facts make the split cheap and were verified against the current code:
- Infra is already decoupled from core internals. `DOMAdapters` is referenced concretely only in the constructor; elsewhere it is injected via `TOKENS.Adapter` as the sdk interface `EditorJSAdapterPlugin` (`BlockRenderer.ts:68`). `CollaborationManager` is a plain `PluginType.Plugin` initialized generically through `#initializePlugin`. Removing both touches only `src/index.ts` + `core/package.json`.
- `ShortcutsPlugin` (`packages/core/src/plugins/ShortcutsPlugin.ts`) stays in `@editorjs/core`; the headless refactor simply stops auto-registering it. Relocating it is deferred to a separate change.

A naming constraint: the monorepo already consumes the published `@editorjs/editorjs` v2 as a types-only dependency in `core`, `sdk`, `ui`, `tools/paragraph`. A workspace package of the same name would shadow it with version-range-dependent resolution.

## Goals / Non-Goals

**Goals:**
- `Core` becomes a headless, tool-agnostic engine that registers nothing by default and fails loudly when preconditions are missing.
- A new `@editorjs/editorjs` package composes core + defaults + UI, auto-initializes, and is a plausible drop-in entry point for v2 users (via `isReady` and `config.tools`).
- No broken intermediate state on the default branch: core stops loading tools and the bundle starts loading them in the same atomic change.

**Non-Goals:**
- Full v2 `EditorJS` API surface (`.save()`, `.blocks.*`, `.destroy()`, `readOnly`, etc.) — a follow-up.
- The object form of v2 `tools` config (`{ name: { class, config, shortcut } }`) — v1 supports the constructor-map form only.
- Publishing a slimmer `@editorjs/core` entry point now that it is headless.
- Rewriting DI: infra stays wired through the existing `use()` / `TOKENS.Adapter` mechanism.

## Decisions

### Free the name by aliasing the v2 dependency (over renaming the new package)
Alias the npm dep as `"editorjs-v2": "npm:@editorjs/editorjs@…"` in the four consuming packages and change their import specifiers. Rationale: the flagship name `@editorjs/editorjs` is the point of a batteries-included package. Alternative — naming the new package `@editorjs/editor`/`bundle` — avoids migration but gives up the drop-in identity. The alias is a mechanical, behavior-neutral rename isolated to one PR.

### Move infra (DOMAdapters, CollaborationManager) to the bundle, not keep in core
Core is left non-functional until an adapter is registered — by design. Rationale: makes core a genuine engine that could accept an alternative renderer; both are already DI-decoupled so the cost is near zero. Trade-off: a bare `new Core(config).initialize()` now throws instead of rendering — acceptable and made explicit by the fail-loud requirement.

### Fail loudly via synchronous precondition checks before the boot `try`
`initialize()` validates `PluginType.Adapter` is bound and that a block tool matching `config.defaultBlock` is registered, throwing clear messages before resolving any module; the bottom `catch` re-throws instead of `console.error`. Rationale: silent `console.error` hides misconfiguration that is now easy to hit (headless core). Alternative — validate lazily deep in rendering — produces opaque failures far from the cause.

### `EditorJS` is a thin composition wrapper that delegates to `Core`
It news up `Core`, `.use()`s infra + defaults + UI, merges `config.tools` by name, then calls `core.initialize()` and stores the promise as `isReady`. Rationale: no engine logic is duplicated; the bundle is pure composition. Alternative — subclassing `Core` — leaks engine internals and complicates the override-by-name merge.

### Override-by-name merge for `config.tools`
Build a name→constructor map seeded with defaults, apply `config.tools` on top (user wins), then `use()` the merged set. Rationale: matches v2 semantics where naming a tool `paragraph` replaces the built-in. Requires each default tool to expose a stable name; block tools already carry one, inline tools are keyed by their registration name.

## Risks / Trade-offs

- [Atomic PR 2 is large: core change + new package + playground swap] → Split the isolated alias rename into PR 1 first; keep PR 2 reviewable by landing core-headless + bundle + playground together but with a tight task list and end-to-end verification in playground.
- [Consumers of `@editorjs/core` outside this repo break] → Intentional and BREAKING; documented in the proposal and the removed/modified core requirements. Bundle is the migration path.
- [Override-by-name relies on consistent tool naming across block vs inline tools] → Verify each default tool's registration name during implementation; add a test asserting a `paragraph` override replaces rather than duplicates.
- [Dropped transitive deps in playground] → After swapping to the bundle, prune now-transitive deps from `playground/package.json` and confirm the app still builds and runs.

## Migration Plan

1. **PR 1 — alias rename** (isolated, mergeable alone): rename dep to `editorjs-v2` and update import specifiers in `core`, `sdk`, `ui`, `tools/paragraph`; `yarn install`; build + typecheck. No behavior change.
2. **PR 2 — headless core + bundle + playground** (atomic): strip core's default `use()` calls + add fail-loud validation (`ShortcutsPlugin` stays in core, unregistered); create `packages/editorjs`; switch playground to `@editorjs/editorjs`; verify end-to-end.

Rollback: PR 1 and PR 2 are independent commits/branches; either can be reverted. PR 2's revert restores core's hardcoded defaults.

## Open Questions

- Should `@editorjs/editorjs` re-export `Core` and the default tools for advanced consumers, or keep its surface minimal? (Leaning: re-export `Core` and tool constructors; decide during implementation.)
- Exact package directory name: `packages/editorjs` (independent of the `@editorjs/editorjs` package name). No conflict expected.
