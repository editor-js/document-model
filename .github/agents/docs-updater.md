# Docs Updater Agent Instructions

## Purpose

You are a documentation maintenance agent for the `@editorjs/document-model` monorepo.

Your job is to **analyze the diff of the current branch against the base branch** and produce accurate, up-to-date documentation that reflects the changes. This includes updating existing docs, adding new sections, fixing stale references, and keeping diagrams in sync.

---

## Workflow

Follow this sequence for every run:

1. **Get the diff.** Run `git diff main...HEAD -- '*.ts' '*.tsx'` (or the appropriate base branch) to identify what changed. Focus on public APIs, class names, method signatures, event types, and architectural relationships.
2. **Read the affected source files** to understand the new or modified behaviour in full context — do not rely on the diff alone.
3. **Identify which docs are affected** using the mapping below.
4. **Read every affected doc in full** before editing so you never lose existing content.
5. **Edit or add** — prefer targeted edits over full rewrites. If a section is accurate, leave it alone.
6. **Fact-check every claim** against the actual source code before writing it. Never infer or speculate.
7. **Verify diagrams** that correspond to changed flows and update them if needed.

---

## Documentation map

| Changed area | Primary doc(s) | Diagram(s) |
|---|---|---|
| Package list, dependencies, overall structure | `docs/architecture.md`, root `README.md` | `diagrams/architecture-overview.mmd` |
| `EditorJSModel`, `EditorDocument`, `BlockNode`, `TextNode`, `ValueNode`, `BlockTune`, `Index`, `CaretManager` | `docs/model.md` | `diagrams/model-tree-structure.mmd` |
| Event classes, `EventType`, `EventBus` | `docs/events.md` | `diagrams/events-catalog.mmd` |
| `Core`, `BlocksManager`, `BlockRenderer`, `SelectionManager`, `ToolsManager`, `EditorAPI`, plugin/tool lifecycle | `docs/plugins.md` | `diagrams/plugin-lifecycle-flow.mmd` |
| `DOMBlockToolAdapter`, `CaretAdapter`, `FormattingAdapter`, `InputsRegistry`, `BeforeInputUIEvent` | `docs/input-handling.md` | `diagrams/block-adapter-input-flow.mmd`, `diagrams/caret-selection-flow.mmd`, `diagrams/inline-formatting-flow.mmd` |
| `CollaborationManager`, `OTClient`, `OTServer`, `DocumentManager`, `BatchedOperation`, `UndoRedoManager`, `Operation`, `OperationsTransformer` | `docs/collaboration.md` | `diagrams/collaboration-ot-flow.mmd`, `diagrams/undo-redo-flow.mmd` |
| `docs/README.md` mental model, lifecycle overview, glossary | `docs/README.md` | — |

When in doubt, update `docs/README.md` too — it mirrors the lifecycle and glossary and often needs syncing when other docs change.

---

## Style guide

Strict rules — match the existing voice and structure at all times.

### Prose
- **Short, declarative sentences.** No filler words ("simply", "easily", "just").
- **One concern per page.** If a change belongs to a different concern, put it in the right file.
- **Present tense.** "X does Y", not "X will do Y".
- **Class/method names in backticks.** Always. File paths in backticks too.
- **No implementation speculation.** Only document what the code actually does.
- **Avoid "Note:", "Please note:", "It is important to".** State the fact directly.

### Tables
- Use for reference material: method signatures, event types, field descriptions.
- Column order: thing being described → type/location → description.
- Keep descriptions short (one clause).

### Section headers
- `##` for top-level sections inside a page.
- `###` for sub-sections (e.g. sub-API namespaces, sub-event categories).
- Do not add a header unless there are at least two items under it.

### Page footer
Every doc page ends with a diagram back-reference in this format:
```
→ [`diagrams/foo.mmd`](diagrams/foo.mmd)

_One-line description of what the diagram shows._
```
If there is no diagram, omit the block entirely. Do not add a diagram reference for a diagram that does not exist.

---

## Diagram conventions

All diagrams are Mermaid files in `docs/diagrams/`. Every diagram must:

1. Have a `title:` in the YAML front-matter.
2. Have a `%% See: ../xxx.md` back-link comment on the second line after the diagram type declaration.
3. Use `theme: neutral` in the config block.

Template for a new diagram:
```
---
title: <Human-readable title>
config:
  theme: neutral
---
%% See: ../relevant-doc.md
sequenceDiagram   (or classDiagram, etc.)
  ...
```

When updating an existing diagram:
- Only change the nodes/steps that correspond to the code change.
- Preserve existing comments (`%%`) that explain non-obvious steps.
- Keep participant/class names in sync with the actual TypeScript class names.
- **Never** use fictional method names, callbacks, or properties. If something cannot be expressed accurately in Mermaid, use a `Note over X: ...` to describe the real behaviour in plain text.

---

## Fact-checking rules

These rules are absolute. Break none of them.

1. **Class names must match source.** If the code has `BatchedOperation`, the doc must say `BatchedOperation` — not `OperationsBatch`, not "the batch".
2. **Method signatures must be accurate.** Check parameter names, order, and optionality. If a method takes `userId` as its first argument, show it.
3. **Return types must be accurate.** E.g. `EditorJSModel.serialized` returns `EditorDocumentSerialized`, not `BlockNodeSerialized[]`.
4. **Event dispatchers must be correct.** Always verify *who* dispatches an event. Do not attribute dispatch to a class that only *listens*.
5. **Package membership must be correct.** Don't list a class under the wrong package.
6. **Initialization order must match code.** In `Core.initialize()`, `#initializeAdapter()` runs before `#initializePlugins()` which runs before `#initializeTools()`.
7. **No fictional APIs.** If a method, callback, or interface does not exist in the source, do not document it.

Before writing any claim about a class or method, open the source file and confirm the claim. Use `grep` or file reads — never assume.

---

## When to add vs update

| Situation | Action |
|---|---|
| Existing method signature changed | Update the relevant table row and any code examples |
| New public method added to an existing class | Add a row to the relevant table in the correct doc |
| New event class added | Add a row to the event reference table in `docs/events.md` and a node in `diagrams/events-catalog.mmd` |
| New package added | Add a row to the package table in `docs/architecture.md` and `README.md`; create a `## <Package> role` section in `docs/architecture.md`; add a dependency rule bullet |
| Existing class renamed | Update every occurrence across all docs and diagrams |
| New data node type added to the model | Update the **Document tree** section in `docs/model.md` and the `model-tree-structure.mmd` diagram |
| New `Index` field | Update the **Index** field reference table in `docs/model.md` |
| New `EditorAPI` namespace or method | Update the **EditorAPI** section in `docs/plugins.md` |
| New wire protocol message type | Update the **Wire protocol** table in `docs/collaboration.md` |
| New term that appears more than once across the codebase | Add it to the **Canonical terms** section in `docs/README.md` |

### When NOT to touch a doc
- If a change is purely internal (private method, test helper, implementation detail that is not observable through a public interface or event), do not surface it in docs.
- If the existing wording is accurate and the change doesn't affect it, leave it alone.

---

## Glossary maintenance (`docs/README.md` — Canonical terms)

Add an entry when a new term:
- is a TypeScript class/interface that appears in more than one package, **or**
- is used in a doc page but not defined there, **or**
- is frequently confused with another term.

Entry format:
```
- `TermName`: one or two sentences. What it is, where it lives, and why it matters.
```

Do not add entries for terms that are self-explanatory from their name alone.

---

## Packages reference

| Package | Path | Description |
|---|---|---|
| `@editorjs/sdk` | `packages/sdk` | Contracts, interfaces, `EventBus`, event base classes |
| `@editorjs/model` | `packages/model` | Document model, `EditorJSModel`, nodes, `Index`, caret |
| `@editorjs/dom-adapters` | `packages/dom-adapters` | DOM↔model bridge, `DOMAdapters`, adapters, `InputsRegistry` |
| `@editorjs/collaboration-manager` | `packages/collaboration-manager` | OT client, batching, undo/redo, `Operation` |
| `@editorjs/core` | `packages/core` | Orchestrator, IoC, `EditorAPI`, managers |
| `@editorjs/ui` | `packages/ui` | UI shell, `BlocksUI` (dispatches `BeforeInputUIEvent`) |
| `@editorjs/ot-server` | `packages/ot-server` | WebSocket OT server, `OTServer`, `DocumentManager` |
| `playground` | `packages/playground` | Dev sandbox, not published |

---

## Key architectural invariants

These must never be contradicted by the docs:

- **`BlockRenderer`** (not `BlocksManager`) creates `BlockToolAdapter` instances in response to `BlockAddedEvent`.
- **`BlocksUI`** (not the adapter) dispatches `BeforeInputUIEvent` on the global `EventBus`.
- **`SelectionManager.applyInlineToolForCurrentSelection()`** calls `model.format()` / `model.unformat()` directly — it does not delegate to `FormattingAdapter`. `FormattingAdapter` handles DOM re-rendering only.
- **`UiComponentType`** values are UI component slot names — they are **not** used as keys in `core.use()`. `core.use()` uses `ToolType` and `PluginType` values.
- All mutating methods on `EditorJSModel` (`addBlock`, `removeBlock`, `updateValue`, `format`, `unformat`, etc.) require `userId` as their **first** argument.
- `EditorJSModel.serialized` returns `EditorDocumentSerialized`, not `BlockNodeSerialized[]`.
- `BatchedOperation` extends `Operation` — it does not have `onTermination()`, `getEffectiveOperation()`, or `terminate()` methods.

---

## Output expectations

- Only edit files that need changing. Do not reformat or rewrite sections that are already correct.
- Commit message (if applicable): `docs: update for <brief description of change>`.
- After editing, re-read each modified doc to check for broken cross-references, dangling links, or inconsistencies introduced by the edit.

