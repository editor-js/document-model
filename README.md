<p align="center">
  <a href="https://editorjs.io/">
    <picture>
      <source media="(prefers-color-scheme: dark)"  srcset="https://raw.githubusercontent.com/codex-team/editor.js/next/assets/logo_night.png">
      <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/codex-team/editor.js/next/assets/logo_day.png">
      <img alt="Editor.js Logo" src="https://raw.githubusercontent.com/codex-team/editor.js/next/assets/logo_day.png">
    </picture>
  </a>
</p>

# @editorjs/document-model

A model-driven, collaboration-ready Editor.js engine split into focused packages.

## Packages

### Base packages

| Package | Description |
|---|---|
| [`@editorjs/model-types`](packages/model-types) | Shared low-level types and base event classes used internally by `model` and `sdk` only — not intended for direct use by other packages or tools |
| [`@editorjs/sdk`](packages/sdk) | Shared contracts — interfaces, base event classes, `EventBus`. The package tools and plugins should depend on |
| [`@editorjs/model`](packages/model) | In-memory document model (`EditorJSModel`, `BlockNode`, `TextNode`, caret management). Internal engine used by `core`/`ot-server` — tools and plugins should use `@editorjs/sdk` instead |
| [`@editorjs/dom-adapters`](packages/dom-adapters) | Binds model nodes to DOM inputs (`DOMBlockToolAdapter`, `CaretAdapter`, `FormattingAdapter`) |
| [`@editorjs/collaboration-manager`](packages/collaboration-manager) | Operational transformation, batching, undo/redo, OT WebSocket client |
| [`@editorjs/core`](packages/core) | Orchestrator — IoC container, plugin/tool lifecycle, `EditorAPI` |
| [`@editorjs/ui`](packages/ui) | Default UI shell (`EditorjsUI`, `BlocksUI`, `Toolbar`, `InlineToolbar`, `Toolbox`) |
| [`@editorjs/ot-server`](packages/ot-server) | Standalone WebSocket OT server (`OTServer`, `DocumentManager`) |
| [`playground`](packages/playground) | Vite dev sandbox for manual testing |

### Tools/Plugins

| Package | Description |
|---|---|
| [`@editorjs/paragraph`](packages/tools/paragraph) | Built-in Paragraph block tool |
| [`@editorjs/bold`](packages/tools/bold) | Built-in Bold inline tool |
| [`@editorjs/italic`](packages/tools/italic) | Built-in Italic inline tool |
| [`@editorjs/inline-link`](packages/tools/inline-link) | Built-in Link inline tool |

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

## Want to contribute?

This project is in active development with many ideas being formed on the fly. If you'd like to contribute — whether it's code, documentation, ideas, or feedback — we'd love to hear from you!

Here are some ways to get involved:

- **Code contributions**: Check out [Good First Tasks](https://github.com/codex-team/editor.js/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+task%22) or reach out to discuss larger features
- **Documentation & guides**: Help us improve and expand our docs
- **Tool development**: Build new tools or adapters for the ecosystem
- **Feedback & ideas**: Share your thoughts and suggestions in discussions or on our [Telegram Chat](https://t.me/codex_editor)
- **Custom requirements**: Need something specific? Contact the CodeX team at team@codex.so

See our [Contributing guide](https://editorjs.io/contributing/) for more details.

## Like Editor.js?

You can support project improvement and development of new features with a donation to our team.

[Donate via OpenCollective](https://opencollective.com/editorjs)
\
[Donate via Crypto](https://codex.so/donate)
\
[Donate via Patreon](https://www.patreon.com/editorjs)

### Why donate

Donations to open-source products have several advantages for your business:

- If your business relies on Editor.js, you'll probably want it to be maintained
- It helps Editor.js to evolve and get the new features
- We can support contributors and the community around the project. You'll receive well organized docs, guides, etc.
- We need to pay for our infrastructure and maintain public resources (domain names, homepages, docs, etc). Supporting it guarantees you to access any resources at the time you need them.
- You can advertise by adding your brand assets and mentions on our public resources

### Sponsors

Support us by becoming a sponsor. Your logo will show up here with a link to your website.

[Become a Sponsor](https://opencollective.com/editorjs/contribute/sir-8679/checkout)

### Backers

Thank you to all our backers!

[Become a Backer](https://opencollective.com/editorjs/contribute/backer-8632/checkout)

## Community

- [Official Tools](https://github.com/editor-js)
- [Awesome Editor.js](https://github.com/editor-js/awesome-editorjs)
- [Good First Tasks](https://github.com/codex-team/editor.js/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+task%22)
- [Contributing](https://editorjs.io/contributing/)
- [Telegram Chat](https://t.me/codex_editor)
