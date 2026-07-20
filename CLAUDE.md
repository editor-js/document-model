# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`@editorjs/document-model` is a model-driven, collaboration-ready Editor.js engine split into focused packages. It's a **Yarn 4 (Berry) workspaces monorepo** (`packages/*` and `packages/tools/*`). Node `v24.15.0` (see `.nvmrc`; `nvm use`), Yarn `4.0.1` via Corepack (`corepack enable`).

## Commands

Run from the repo root (fan out across all workspaces via `yarn workspaces foreach`):

```bash
yarn install      # install all workspace deps + set up Husky (pre-commit runs `yarn constraints`)
yarn build        # build every package (tsc --build)
yarn test         # run every package's Jest suite
yarn lint         # lint every package (ESLint, eslint-config-codex)
yarn lint:fix     # lint + auto-fix
```

Per-package (prefer this while iterating — much faster):

```bash
cd packages/model
yarn test                       # Jest
yarn test path/to/File.spec.ts  # single file
yarn test -t "should do X"      # single test by name
yarn test:coverage
yarn test:mutations             # Stryker mutation testing (only some packages, e.g. model, core)
yarn lint
yarn dev                        # tsc --build --watch
```

Playground (manual end-to-end testing): `cd packages/playground && yarn dev`

OT server (Docker): create `.env` at repo root with `WSS_PORT=8080`, then `docker compose up`.

**ESM caveat:** `core` and `ot-server` run Jest under `node --experimental-vm-modules` (baked into their `test` script). If you invoke Jest manually in those packages, keep that flag.

## Architecture

Layered packages with a strict dependency direction. Full detail in `docs/architecture.md` — read the relevant `docs/` page before structural changes.

- **`model-types`** — foundation layer: shared low-level types, nominal brands, base event classes (`Index`, event classes, `EventBus`). No runtime deps. **Only `model` and `sdk` may depend on it directly.**
- **`sdk`** — the contract layer (interfaces, `EventBus`, `BlockTool`/`InlineTool`). Re-exports everything from `model`/`model-types` that a tool author legitimately needs. **All tools, plugins, and non-engine packages depend on `sdk`, never on `model` or `model-types` directly.**
- **`model`** — in-memory document model (`EditorJSModel`, `BlockNode`, `TextNode`, inline-fragments, caret management). The engine backing `EditorJSModel`; consumed directly only by `core` and `ot-server`. No DOM concerns. Free to change internals since it isn't the tool-facing surface.
- **`dom-adapters`** — binds model nodes to DOM inputs (`DOMBlockToolAdapter`, `CaretAdapter`, `FormattingAdapter`). Observes/applies model changes via public APIs + events; depends only on `sdk`.
- **`collaboration-manager`** — operational transformation, batching, undo/redo, OT WebSocket client. Depends only on `sdk`.
- **`core`** — the orchestrator and single owner of service wiring: IoC container (`inversify`), plugin/tool lifecycle, `EditorAPI`, local undo/redo (`UndoRedoManager`). Entry point: services wired in constructor, `core.use(...)` registers UI plugins/tools, `initialize()` prepares tools + model + collaboration.
- **`ui`** — default UI shell (`EditorjsUI`, `BlocksUI`, `Toolbar`, `InlineToolbar`, `Toolbox`); registered as an `EditorjsPlugin` via `core.use()`. `BlocksUI` owns the `contenteditable`, normalizes browser `beforeinput` into `BeforeInputUIEvent` on the global `EventBus`.
- **`ot-server`** — standalone Node.js WebSocket OT server (`OTServer`, `DocumentManager`), one `DocumentManager` per `documentId`; transforms/applies/broadcasts operations. Server-side only.
- **`packages/tools/*`** — built-in block/inline tools (`paragraph`, `bold`, `italic`, `inline-link`), each implementing `BlockTool`/`InlineTool` from `@editorjs/sdk`.

Avoid direct cross-layer coupling: communicate through `sdk` interfaces/events and mutate via `EditorJSModel`'s public API.

## Testing

- Tests are **co-located** with source: `*.spec.ts` (unit) and `*.integration.spec.ts` (integration), run with Jest (`ts-jest`, ESM).
- **TDD is required** (per `openspec/config.yaml`): write the failing test first, then implement, then refactor.
- Name test cases in **should-notation**: `it('should return X when Y')`.
- CI runs lint/test/build per affected package, plus Stryker mutation tests where configured (changed files on PRs, all files on merge groups).

## Spec-driven development (OpenSpec)

This repo practices spec-driven development with [OpenSpec](https://github.com/Fission-AI/OpenSpec). Source-of-truth specs live in `openspec/specs/` (one folder per package/area); conventions are in `openspec/config.yaml`.

For any non-trivial change (new capability, breaking change, architectural shift, or anything altering behavior described in `openspec/specs/`), **start with a change proposal** under `openspec/changes/<name>/` rather than jumping into code. Small fixes/typos/behavior-preserving refactors don't need one.

Use the `/opsx:*` slash commands / skills (`explore`, `propose`, `apply`, `verify`, `sync`, `archive`, `update`) or the `openspec` CLI directly (`openspec list|show|validate|view`). A behavior change to spec-covered code without a proposal will be flagged in review.

## Conventions

- **Commits:** Conventional Commits scoped to the package, e.g. `fix(sdk): remove @/ alias from tsconfig`, `refactor(link): extract link inline tool into standalone package`.
- **Docs:** Public-API/architectural changes must update `docs/` and its Mermaid diagrams in `docs/diagrams/`. Keep diagram node/class names in sync with real TypeScript identifiers; never invent methods/properties. See `.github/agents/docs-updater.agent.md` for which doc/diagram pairs map to which code.
- **New tools/plugins:** depend on `@editorjs/sdk` only.
- ESLint (`eslint-config-codex`) is the source of truth for style; CI enforces zero warnings.
