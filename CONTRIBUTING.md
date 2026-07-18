# Contributing to @editorjs/document-model

Thanks for your interest in contributing! This repo is a Yarn 4 (Berry) workspaces monorepo containing the model-driven, collaboration-ready Editor.js engine. This guide covers local setup, day-to-day development, and — since this project practices **spec-driven development with [OpenSpec](https://github.com/Fission-AI/OpenSpec)** — how specs and change proposals fit into the workflow.

For a general, non-technical overview of ways to get involved, see the [Want to contribute?](README.md#want-to-contribute) section of the README and [editorjs.io/contributing](https://editorjs.io/contributing/).

## Getting started

**Prerequisites**
- Node.js `v24.15.0` (see [`.nvmrc`](.nvmrc) — use `nvm use` if you manage versions with nvm)
- Yarn `4.0.1` via [Corepack](https://yarnpkg.com/corepack) (`corepack enable`)

**Setup**
```bash
yarn install
```

This installs dependencies for every workspace under `packages/*` and `packages/tools/*`, and sets up the Husky git hook (`yarn constraints` runs on pre-commit to keep workspace dependency versions consistent).

**Common commands** (from the repo root, across all packages):
```bash
yarn build        # build every package
yarn test          # run every package's test suite
yarn lint          # lint every package
yarn lint:fix       # lint and auto-fix every package
```

To work within a single package:
```bash
cd packages/model
yarn test
yarn test:coverage
yarn lint
```

Some packages (e.g. `model`) also run Stryker mutation testing via `yarn test:mutations`.

To try changes end-to-end, use the Vite playground:
```bash
cd packages/playground && yarn dev
```

The OT collaboration server can be run via Docker: `docker compose up`.

## Project structure

- `packages/model-types` — shared low-level types/event base classes (internal to `model`/`sdk`)
- `packages/sdk` — public contracts (`EventBus`, interfaces) that tools/plugins should depend on
- `packages/model` — the in-memory document model (`EditorJSModel`, `BlockNode`, `TextNode`, caret management)
- `packages/dom-adapters` — binds model nodes to DOM inputs
- `packages/collaboration-manager` — OT, batching, undo/redo, OT WebSocket client
- `packages/core` — orchestrator (IoC container, plugin/tool lifecycle, `EditorAPI`)
- `packages/ui` — default UI shell
- `packages/ot-server` — standalone WebSocket OT server
- `packages/playground` — manual testing sandbox
- `packages/tools/*` — built-in block/inline tools (paragraph, bold, italic, inline-link), each implementing `BlockTool`/`InlineTool` from `@editorjs/sdk`

New tools/plugins should depend on `@editorjs/sdk`, not `@editorjs/model` directly.

Architecture, data model, input handling, plugin lifecycle, collaboration, and event system docs live in [`docs/`](docs/README.md), with Mermaid diagrams in `docs/diagrams/`. Read the relevant page before making structural changes — and expect PRs that touch public APIs to require doc updates (see [Documentation](#documentation) below).

## Spec-driven development with OpenSpec

This repo's source-of-truth specs live in [`openspec/specs/`](openspec/specs) (one folder per package/area, e.g. `model`, `core`, `collaboration-manager`, `sdk`, `architecture`). Project-wide conventions for AI-assisted work are configured in [`openspec/config.yaml`](openspec/config.yaml), including:

- **TDD is required**: write a failing test first, then implement, then refactor.
- **Test naming**: use should-notation, e.g. `it('should return X when Y')`.
- **Proposals must cross-check `docs/`** and call out anything they supersede.

### When to write a change proposal

For any non-trivial change (new capability, breaking change, architectural shift, or anything that alters behavior described in `openspec/specs/`), start with an OpenSpec change proposal instead of jumping straight into code. Small fixes, typo corrections, and refactors that don't change behavior don't need one — use your judgment, and feel free to ask in a draft PR or issue if unsure.

### Workflow

The [OpenSpec CLI](https://github.com/Fission-AI/OpenSpec) (`@fission-ai/openspec`) drives this. Install it globally or use `npx openspec`:

```bash
npm install -g @fission-ai/openspec
```

Typical flow for a change:

1. **Explore** (optional) — think through the problem and requirements before committing to an approach.
2. **Propose** — create a change under `openspec/changes/<change-name>/` with `proposal.md` (what & why), `design.md` (how), and `tasks.md` (implementation steps):
   ```bash
   openspec new change "<change-name>"
   openspec status --change "<change-name>"
   ```
3. **Apply** — implement the tasks in `tasks.md`, following TDD as required by `openspec/config.yaml`.
4. **Verify** — check the implementation matches the proposal's specs and tasks before wrapping up.
5. **Archive / Sync** — once merged, archive the change (`openspec archive <change-name>`) to fold its delta specs into `openspec/specs/`, or sync specs without archiving if the change is still in flight.

Useful CLI commands while working on a change:
```bash
openspec list                       # list active changes/specs
openspec show <item-name>           # show a change or spec
openspec validate <item-name>       # validate a change/spec against its schema
openspec view                       # interactive dashboard
```

If you're using Claude Code in this repo, the same workflow is available as slash commands (`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:sync`, `/opsx:archive`, `/opsx:update`) and equivalent skills — these wrap the CLI above and keep proposal/spec/task files coherent as you iterate.

Keep specs and code in sync: a PR that changes behavior covered by `openspec/specs/` without a corresponding proposal/archive will likely be asked to add one during review.

## Testing

- Tests are co-located with source as `*.spec.ts` (unit) and `*.integration.spec.ts` (integration), run with Jest.
- Name test cases in should-notation: `it('should return X when Y')`.
- Write the failing test before the implementation (TDD), per `openspec/config.yaml`.
- Some packages run Stryker mutation testing (`yarn test:mutations`); CI runs mutation tests on changed files for PRs and on all files for merge groups.

## Linting and code style

- ESLint (`eslint-config-codex`) is the source of truth for style; run `yarn lint` (or `yarn lint:fix`) before pushing.
- CI enforces `lint:ci` with zero warnings allowed per package.

## Commit messages

Recent history favors [Conventional Commits](https://www.conventionalcommits.org/)-style messages scoped to a package, e.g.:
```
fix(sdk): remove @/ alias from tsconfig
refactor(link): extract link inline tool into standalone package
```
Use a scope matching the package you changed where it makes sense (`model`, `core`, `sdk`, `collaboration-manager`, etc.).

## Documentation

Public API or architectural changes should be reflected in `docs/` (see the map in [`.github/agents/docs-updater.agent.md`](.github/agents/docs-updater.agent.md) for which doc/diagram pairs correspond to which parts of the codebase). Diagrams are Mermaid files in `docs/diagrams/` — keep node/class names in sync with actual TypeScript identifiers, and never invent methods or properties that don't exist.

## Opening a pull request

- CI runs per affected package (lint, unit tests, build, and mutation tests where configured) — only packages whose files (or dependencies) changed will run.
- Make sure `yarn build`, `yarn test`, and `yarn lint` pass locally for any package you touched.
- If your change is behavior-affecting, link the relevant OpenSpec change (or note that one wasn't needed and why).
- Keep PRs scoped to one package/concern where possible, matching the existing commit convention.

## Getting help

- [Good First Tasks](https://github.com/codex-team/editor.js/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+task%22)
- [Telegram Chat](https://t.me/codex_editor)
- Custom requirements: team@codex.so
