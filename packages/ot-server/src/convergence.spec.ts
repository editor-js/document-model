/* eslint-disable @typescript-eslint/no-magic-numbers */
import { MessageType, Operation, OperationType, OTClient, type SerializedOperation } from '@editorjs/collaboration-manager';
import { EditorJSModel } from '@editorjs/model';
import { createDataKey, type DocumentId, Index } from '@editorjs/sdk';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { DocumentManager } from './DocumentManager.js';

const documentId = 'document' as DocumentId;

/**
 * Serialized document every participant starts from: one paragraph holding "hello"
 */
const initialDocument = {
  identifier: documentId,
  properties: {},
  blocks: [{
    name: 'paragraph',
    data: {
      text: {
        $t: 't',
        value: 'hello',
        fragments: [],
      },
    },
  }],
};

type Listener = (event: { data: string }) => void;

/**
 * In-memory stand-in for the OT server and its sockets.
 * Messages are queued and delivered only when the test says so, so interleavings are explicit.
 */
class Hub {
  public readonly manager = new DocumentManager(documentId);

  public readonly sockets: HubSocket[] = [];

  public readonly serverInbox: SerializedOperation[] = [];

  /**
   * Processes the next operation the server received and broadcasts it to every socket
   */
  public async deliverToServer(): Promise<void> {
    const payload = this.serverInbox.shift()!;
    const processed = await this.manager.process(Operation.from(payload));

    if (processed === null) {
      throw new Error('Server rejected the operation');
    }

    this.sockets.forEach(socket => socket.inbox.push(JSON.stringify({
      type: MessageType.Operation,
      payload: processed.serialize(),
    })));
  }

  /**
   * Delivers every queued server message to the socket of the given client
   * @param i - client number
   */
  public deliverToClient(i: number): void {
    const socket = this.sockets[i];

    while (socket.inbox.length > 0) {
      socket.emit('message', { data: socket.inbox.shift()! });
    }
  }
}

let hub: Hub;

/**
 * WebSocket double routed through the hub
 */
class HubSocket {
  public readonly inbox: string[] = [];

  readonly #listeners = new Map<string, Set<Listener>>();

  /**
   * Registers the socket in the hub and opens it asynchronously, like a real WebSocket
   */
  constructor() {
    hub.sockets.push(this);
    // eslint-disable-next-line no-undef -- queueMicrotask is available in Node runtime
    queueMicrotask(() => this.emit('open', { data: '' }));
  }

  /**
   * @param type - event type
   * @param listener - listener
   */
  public addEventListener(type: string, listener: Listener): void {
    if (!this.#listeners.has(type)) {
      this.#listeners.set(type, new Set());
    }

    this.#listeners.get(type)!.add(listener);
  }

  /**
   * @param type - event type
   * @param listener - listener
   */
  public removeEventListener(type: string, listener: Listener): void {
    this.#listeners.get(type)?.delete(listener);
  }

  /**
   * Handshakes are answered immediately; operations are queued for the server
   * @param raw - serialized message
   */
  public send(raw: string): void {
    const message = JSON.parse(raw) as { type: MessageType; payload: unknown };

    if (message.type === MessageType.Handshake) {
      const payload = message.payload as Record<string, unknown>;

      // eslint-disable-next-line no-undef -- queueMicrotask is available in Node runtime
      queueMicrotask(() => this.emit('message', {
        data: JSON.stringify({
          type: MessageType.Handshake,
          payload: { ...payload,
            rev: hub.manager.currentRev },
        }),
      }));

      return;
    }

    hub.serverInbox.push(message.payload as SerializedOperation);
  }

  /**
   * No-op
   */
  public close(): void {}

  /**
   * @param type - event type
   * @param event - event
   */
  public emit(type: string, event: { data: string }): void {
    Array.from(this.#listeners.get(type) ?? []).forEach(fn => fn(event));
  }
}

/**
 * A collaborating client: its own model plus an OTClient applying remote operations to it
 */
class Participant {
  public readonly model: EditorJSModel;

  public readonly client: OTClient;

  /**
   * @param userId - participant's user id
   */
  constructor(public readonly userId: string) {
    this.model = new EditorJSModel(userId, { identifier: documentId });
    this.model.initializeDocument(initialDocument);
    this.client = new OTClient('ws://hub.invalid', userId, () => {}, (op) => {
      this.model.insertData(op.userId, op.index, op.data.payload as string);
    });
  }

  /**
   * Inserts text locally and sends the operation, as CollaborationManager would
   * @param text - text to insert
   * @param at - char position
   */
  public async type(text: string, at: number): Promise<void> {
    this.model.insertText(this.userId, 0, createDataKey('text'), text, at);

    const index = Index.text([{ blockIndex: 0,
      dataKey: createDataKey('text'),
      textRange: [at, at],
      documentId }]);

    await this.client.send(new Operation(OperationType.Insert, index, { payload: text }, this.userId));
  }

  /**
   * Current paragraph text
   */
  public get text(): string {
    return (this.model.serialized.blocks[0].data.text as { value: string }).value;
  }
}

/**
 * Lets queued microtasks (socket open, handshake, sends) settle
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

/**
 * Text of the paragraph in the server's model
 */
function serverText(): string {
  return (hub.manager.currentModelState().blocks[0].data.text as { value: string }).value;
}

describe('OT convergence between two clients and the server', () => {
  let OriginalWebSocket: typeof WebSocket;
  let x: Participant;
  let y: Participant;

  beforeEach(async () => {
    OriginalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = HubSocket as unknown as typeof WebSocket;
    hub = new Hub();
    hub.manager.initializeDocument(initialDocument);

    x = new Participant('x');
    y = new Participant('y');

    await x.client.connectDocument(x.model.serialized);
    await y.client.connectDocument(y.model.serialized);
    await settle();
  });

  afterEach(() => {
    globalThis.WebSocket = OriginalWebSocket;
  });

  it('should converge when a remote insert arrives while the local insert is unacknowledged', async () => {
    await x.type('xx', 0);
    await y.type('y', 5);
    await settle();

    // Server orders X first, then Y
    await hub.deliverToServer();
    await hub.deliverToServer();

    hub.deliverToClient(0);
    hub.deliverToClient(1);
    await settle();

    expect(serverText()).toBe('xxhelloy');
    expect(x.text).toBe('xxhelloy');
    expect(y.text).toBe('xxhelloy');
  });

  it('should converge when both clients insert at the same position', async () => {
    await x.type('x', 0);
    await y.type('y', 0);
    await settle();

    await hub.deliverToServer();
    await hub.deliverToServer();

    hub.deliverToClient(0);
    hub.deliverToClient(1);
    await settle();

    expect(x.text).toBe(serverText());
    expect(y.text).toBe(serverText());
  });

  it('should converge when a queued local insert is sent after a remote insert landed before it', async () => {
    // X: first op in flight, second op queued behind it
    await x.type('a', 5);
    await x.type('b', 6);
    // Y inserts at the start, ordered by the server before any of X's operations
    await y.type('yy', 0);
    await settle();

    // Y's operation was sent before X's first one reaches the server
    hub.serverInbox.unshift(hub.serverInbox.pop()!);

    await hub.deliverToServer(); // Y
    hub.deliverToClient(0); // X sees Y while 'a' is in flight and 'b' is queued
    await hub.deliverToServer(); // X 'a'
    hub.deliverToClient(0); // ack for 'a' → X sends 'b'
    await settle();
    await hub.deliverToServer(); // X 'b'

    hub.deliverToClient(0);
    hub.deliverToClient(1);
    await settle();

    expect(serverText()).toBe('yyhelloab');
    expect(x.text).toBe('yyhelloab');
    expect(y.text).toBe('yyhelloab');
  });
});
