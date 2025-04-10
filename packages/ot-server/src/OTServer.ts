import type { Message } from '@editorjs/collaboration-manager';
import {
  type HandshakePayload,
  MessageType,
  Operation,
  type SerializedOperation
} from '@editorjs/collaboration-manager';
import type { DocumentId } from '@editorjs/model';
import { type WebSocket, WebSocketServer } from 'ws';
import { DocumentManager } from './DocumentManager.js';
import process from 'process';

const BAD_REQUEST_CODE = 4400;

/**
 * OT Server class manages client connections and ws messages processing
 * @todo add tests
 */
export class OTServer {
  /**
   * Map of all clients grouped document id
   */
  #clients: Map<DocumentId, Set<WebSocket>> = new Map();

  /**
   * Map of document managers by document id
   */
  #managers: Map<DocumentId, DocumentManager> = new Map();

  /**
   * WebSocket server instance
   */
  #wss: WebSocketServer | null = null;

  /**
   * Start websocket servier
   */
  public start(): void {
    this.#wss = new WebSocketServer({ port: parseInt(process.env.WSS_PORT ?? '8080') });

    this.#wss.on('connection', ws => this.#onConnection(ws));
  }

  /**
   * Connection callback
   * @param ws - client websocket
   */
  #onConnection(ws: WebSocket): void {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    ws.on('message', message => this.#onMessage(ws, JSON.parse(message.toString()) as Message));
    ws.on('close', () => this.#onClose(ws));
  }

  /**
   * Client message callback
   * @param ws - client websocket
   * @param message - client message
   */
  #onMessage(ws: WebSocket, message: Message): void {
    switch (message.type) {
      case MessageType.Handshake:
        this.#onHandshake(ws, message.payload as HandshakePayload);

        return;
      case MessageType.Operation:
        void this.#onOperation(ws, message.payload as SerializedOperation);

        return;
    }
  }

  /**
   * Client websocket close event callback
   * @param ws - client websocket
   */
  #onClose(ws: WebSocket): void {
    const [documentId, documentClient] = this.#clients.entries().find(([, clients]) => clients.has(ws)) ?? [];

    if (documentId === undefined || documentClient === undefined) {
      return;
    }

    documentClient.delete(ws);

    if (documentClient.size === 0) {
      this.#clients.delete(documentId);
      this.#managers.delete(documentId);
    }
  }

  /**
   * Handshake callback
   * @param ws - client websocket
   * @param payload - handshake payload
   */
  #onHandshake(ws: WebSocket, payload: HandshakePayload): void {
    const documentId = payload.document;

    if (documentId === undefined) {
      ws.close(BAD_REQUEST_CODE, 'No document id for operation provided');

      return;
    }

    let firstConnection = false;

    if (!this.#managers.has(documentId)) {
      firstConnection = true;

      this.#managers.set(documentId, new DocumentManager(documentId));
      this.#clients.set(documentId, new Set());
    }

    this.#clients.get(documentId)!.add(ws);
    const manager = this.#managers.get(documentId)!;

    if (firstConnection && payload.data) {
      manager.initializeDocument(payload.data);
    }

    ws.send(JSON.stringify({
      type: MessageType.Handshake,
      payload: {
        ...payload,
        rev: manager.currentRev,
        data: firstConnection ? undefined : manager.currentModelState(),
      },
    }));
  }

  /**
   * Client operation callback
   * @param ws - client websocket
   * @param payload - operation payload
   */
  async #onOperation(ws: WebSocket, payload: SerializedOperation): Promise<void> {
    const operation = Operation.from(payload);
    const documentId = operation.index.documentId;

    if (!documentId) {
      ws.close(BAD_REQUEST_CODE, 'No document id for operation provided');

      return;
    }

    if (!this.#managers.has(documentId)) {
      ws.close(BAD_REQUEST_CODE, 'No document found for the operation');
    }

    const manager = this.#managers.get(documentId)!;
    const clients = this.#clients.get(documentId)!;

    const processedOperation = await manager.process(operation);

    if (processedOperation === null) {
      ws.close(BAD_REQUEST_CODE, 'Operation couldn\'t be processed');

      return;
    }

    clients.forEach((client) => {
      client.send(JSON.stringify({
        type: MessageType.Operation,
        payload: processedOperation.serialize(),
      }));
    });
  }
}
