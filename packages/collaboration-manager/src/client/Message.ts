import type { DocumentId, EditorDocumentSerialized } from '@editorjs/model';
import type { MessageType } from './MessageType.js';
import type { SerializedOperation } from '../Operation.js';

/**
 * Payload of the handshake message
 */
export interface HandshakePayload {
  /**
   * Document id to edit
   */
  document: DocumentId

  /**
   * User identifier
   */
  userId: string | number;

  /**
   * Document revision
   */
  rev: number;

  /**
   * Current document state
   */
  data?: EditorDocumentSerialized;
}

/**
 * WebSocket message object
 */
export interface Message<P = unknown> {
  /**
   * Message type (e.g. Handshake, Operation)
   */
  type: MessageType;

  /**
   * Message payload
   */
  payload: P;
}

/**
 * Handshake websocket message
 */
export type HandshakeMessage = Message<HandshakePayload>;

/**
 * Operation websocket message
 */
export type OperationMessage = Message<SerializedOperation>;
