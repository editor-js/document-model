export type { Nominal } from './Nominal.js';
export { create } from './Nominal.js';
export type {
  BlockId,
  BlockIndexOrId,
  BlockToolName
} from './BlockId.js';
export {
  createBlockId,
  generateBlockId,
  createBlockToolName
} from './BlockId.js';
export type {
  BlockTuneName,
  BlockTuneSerialized
} from './BlockTune.js';
export { createBlockTuneName } from './BlockTune.js';
export type { DataKey } from './DataKey.js';
export { createDataKey } from './DataKey.js';
export type {
  BlockChildNodeSerialized,
  BlockNodeDataSerializedValue,
  BlockNodeDataSerialized,
  BlockData,
  BlockNodeSerialized,
  BlockNodeInit
} from './BlockNode.js';
export type {
  TextRange,
  InlineFragment,
  InlineTreeNodeSerialized,
  TextNodeSerialized
} from './Text.js';
export type {
  ValueSerialized,
  ValueBrand
} from './Value.js';
export type {
  InlineToolName,
  InlineToolData
} from './InlineTool.js';
export {
  createInlineToolName,
  createInlineToolData
} from './InlineTool.js';
export type {
  Properties,
  DocumentData,
  EditorDocumentSerialized
} from './EditorDocument.js';
export type {
  ChangeData
} from './ChangeData.js';
export type { Caret } from './Caret.js';

// TODO: keypath is a generic object-traversal utility unrelated to the model
// domain; it lives here only so both `model` and `sdk` (which must not depend
// on each other) can share one implementation. Extract to a standalone
// `@editorjs/utils` package and depend on that from here, `model`, and `sdk`.
export { get, set, has, insert, remove, renumberKeys } from './keypath.js';
export {
  EventBus,
  type ModifiedEventData
} from './EventBus.js';
export type {
  BlockEvents,
  TextNodeEvents,
  ValueNodeEvents,
  BlockTuneEvents,
  DocumentEvents,
  ModelEvents,
  CaretManagerEvents
} from './EventMap.js';

export { NODE_TYPE_HIDDEN_PROP, BlockChildType } from './BlockChildType.js';
export { FormattingAction } from './FormattingAction.js';
export { IntersectType } from './IntersectType.js';

export { EventAction } from './EventAction.js';
export { EventType } from './EventType.js';
export type { DocumentId } from './indexing.js';
export {
  Index,
  IndexBase,
  IndexKind,
  DocumentIndex,
  PropertyIndex,
  BlockIndex,
  TuneIndex,
  DataIndex,
  TextIndex,
  PartialIndex,
  type TextSegment
} from './Index/index.js';
export {
  BaseDocumentEvent,
  type EventPayloadBase
} from './BaseDocumentEvent.js';
export {
  DataNodeAddedEvent,
  DataNodeRemovedEvent,
  ValueModifiedEvent,
  TextAddedEvent,
  TextRemovedEvent,
  TextFormattedEvent,
  TextUnformattedEvent,
  type TextFormattedEventData,
  type TextUnformattedEventData,
  CaretManagerCaretUpdatedEvent,
  type CaretSerialized,
  CaretManagerCaretAddedEvent,
  CaretManagerCaretRemovedEvent,
  BlockAddedEvent,
  BlockRemovedEvent,
  PropertyModifiedEvent,
  TuneModifiedEvent
} from './events/index.js';
