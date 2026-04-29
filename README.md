# @editorjs/document-model

A model-driven, collaboration-ready Editor.js engine split into focused packages.

## Packages

| Package | Description |
|---|---|
| [`@editorjs/sdk`](packages/sdk) | Shared contracts — interfaces, base event classes, `EventBus` |
| [`@editorjs/model`](packages/model) | In-memory document model (`EditorJSModel`, `BlockNode`, `TextNode`, caret management) |
| [`@editorjs/dom-adapters`](packages/dom-adapters) | Binds model nodes to DOM inputs (`DOMBlockToolAdapter`, `CaretAdapter`, `FormattingAdapter`) |
| [`@editorjs/collaboration-manager`](packages/collaboration-manager) | Operational transformation, batching, undo/redo, OT WebSocket client |
| [`@editorjs/core`](packages/core) | Orchestrator — IoC container, plugin/tool lifecycle, `EditorAPI` |
| [`@editorjs/ui`](packages/ui) | Default UI shell (`EditorjsUI`, `BlocksUI`, `Toolbar`, `InlineToolbar`, `Toolbox`) |
| [`@editorjs/ot-server`](packages/ot-server) | Standalone WebSocket OT server (`OTServer`, `DocumentManager`) |
| [`playground`](packages/playground) | Vite dev sandbox for manual testing |

## Documentation

In-depth architecture, flow, and API docs live in [`docs/`](docs/README.md).

Quick links:
- [Architecture overview](docs/architecture.md)
- [Data model](docs/model.md)
- [Input handling & caret](docs/input-handling.md)
- [Plugins & Tools](docs/plugins.md)
- [Collaboration & Undo/Redo](docs/collaboration.md)
- [Event system](docs/events.md)

## Development

```bash
# Install all package dependencies
yarn install

# Build all packages
yarn workspaces run build

# Run tests for a specific package (e.g. model)
cd packages/model && yarn test

# Start the playground
cd packages/playground && yarn dev

# Start the OT server (Docker)
docker compose up
```
