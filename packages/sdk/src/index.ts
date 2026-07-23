/**
 * Maps a plugin's `name` to the public API that plugin exposes through `api.plugins`.
 *
 * The interface is intentionally empty: plugin packages fill in their own row via module
 * augmentation, so neither the SDK nor the Core ever needs to know a concrete plugin.
 *
 * Declared in this module (and not in `entities/`) on purpose — TypeScript merges an
 * augmentation only into the module that declares the interface, so augmenting
 * `@editorjs/sdk` would not reach a declaration that lives behind a re-export.
 * @example
 * declare module '@editorjs/sdk' {
 *   interface EditorjsPluginApiMap {
 *     shortcuts: ShortcutsPluginApi;
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled in by plugin packages via module augmentation
export interface EditorjsPluginApiMap {}

/**
 * Maps a plugin's `name` to the options shape tools may address to that plugin
 * under `options.plugins`.
 *
 * Augmented by plugin packages the same way as {@link EditorjsPluginApiMap}.
 * @example
 * declare module '@editorjs/sdk' {
 *   interface ToolPluginOptionsMap {
 *     shortcuts: ShortcutsToolOptions;
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled in by plugin packages via module augmentation
export interface ToolPluginOptionsMap {}

/**
 * Identifier of a plugin — the value of its static `name`.
 *
 * Known ids (those present in either map) keep their literal type so they can be looked up in
 * the maps; the `string & {}` arm keeps ids legal for plugins that augment neither map, while
 * still preserving literal inference and autocomplete for the known ones.
 */
export type PluginId = keyof EditorjsPluginApiMap | keyof ToolPluginOptionsMap | (string & {});

/**
 * Registry of plugin public APIs, exposed as `api.plugins`.
 *
 * `Partial` is what makes unknown keys a compile error, known keys typed, and every entry
 * possibly `undefined` — the type map is global to a compilation while the registry is
 * per editor instance, so a plugin whose types are imported may still never be registered.
 */
export type PluginsAPI = Partial<EditorjsPluginApiMap>;

/**
 * Plugin-directed configuration declared by a tool under `options.plugins`.
 */
export type ToolPluginOptions = Partial<ToolPluginOptionsMap>;

export * from './entities/index.js';
export * from './tools/index.js';
export type * from './api/index.js';
export { matchKeyboardShortcut } from './utils/keyboardShortcut.js';
export { get, set, has, insert, remove, renumberKeys } from './utils/keypath.js';
export type {
  Nominal,
  BlockId,
  BlockIndexOrId,
  DataKey,
  BlockData,
  BlockNodeInit,
  BlockNodeSerialized,
  BlockToolName,
  BlockTuneName,
  BlockTuneSerialized,
  TextRange,
  InlineFragment,
  InlineTreeNodeSerialized,
  TextNodeSerialized,
  ValueSerialized,
  InlineToolName,
  InlineToolData,
  Properties,
  DocumentData,
  EditorDocumentSerialized,
  ChangeData,
  Caret,
  ModifiedEventData,
  ModelEvents,
  CaretManagerEvents,
  DocumentId,
  DocumentIndex,
  TextFormattedEventData,
  TextUnformattedEventData,
  CaretSerialized,
  EventPayloadBase
} from '@editorjs/model-types';
export {
  FormattingAction,
  IntersectType,
  BlockChildType,
  NODE_TYPE_HIDDEN_PROP,
  EventBus,
  createBlockId,
  generateBlockId,
  createBlockToolName,
  createDataKey,
  createBlockTuneName,
  createInlineToolName,
  createInlineToolData,
  EventAction,
  EventType,
  Index,
  IndexBuilder,
  BaseDocumentEvent,
  DataNodeAddedEvent,
  DataNodeRemovedEvent,
  ValueModifiedEvent,
  TextAddedEvent,
  TextRemovedEvent,
  TextFormattedEvent,
  TextUnformattedEvent,
  CaretManagerCaretUpdatedEvent,
  CaretManagerCaretAddedEvent,
  CaretManagerCaretRemovedEvent,
  BlockAddedEvent,
  BlockRemovedEvent,
  PropertyModifiedEvent,
  TuneModifiedEvent
} from '@editorjs/model-types';
