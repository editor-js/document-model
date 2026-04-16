import type { DocumentId, EditorDocumentSerialized } from '@editorjs/model';
import { createDataKey, EditorJSModel, IndexBuilder } from '@editorjs/model';
import { beforeEach, afterEach, jest } from '@jest/globals';
import type { CoreConfig } from '@editorjs/sdk';
import type { HandshakePayload } from './Message.js';
import { MessageType } from './MessageType.js';
import { OTClient } from './OTClient.js';
import { CollaborationManager } from '../CollaborationManager.js';
import { Operation, OperationType } from '../Operation.js';

const userId = 'user';
const remoteUserId = 'remote-user';
const documentId = 'document';

const config: CoreConfig = {
  userId,
  documentId: documentId,
};

describe('OTClient', () => {
  describe('connect (mocked WebSocket)', () => {
    const collabWsUrl = 'ws://test-collab.invalid/document';

    type WsListener = (event: { data: string }) => void;

    /**
     * Minimal WebSocket double so the test can act as OT server (handshake + remote ops).
     */
    class MockWebSocket {
      public static lastInstance: MockWebSocket | null = null;

      public readonly url: string;

      public readyState: number = 0;

      private readonly listeners = new Map<string, Set<WsListener>>();

      /**
       * @param url - ws connection url that would be mocked
       */
      constructor(url: string | URL) {
        this.url = typeof url === 'string' ? url : url.toString();
        MockWebSocket.lastInstance = this;
        // eslint-disable-next-line no-undef -- queueMicrotask is available in Node runtime
        queueMicrotask(() => {
          this.readyState = 1;
          this.#emit('open', { data: '' });
        });
      }

      /**
       * Adds event listener
       *
       * @param type - event type
       * @param listener - listener function
       */
      public addEventListener(type: string, listener: WsListener | EventListenerObject): void {
        if (typeof listener !== 'function') {
          return;
        }

        let set = this.listeners.get(type);

        if (!set) {
          set = new Set();
          this.listeners.set(type, set);
        }

        set.add(listener);
      }

      /**
       * Removes event listener
       *
       * @param type - event type
       * @param listener - listener function
       */
      public removeEventListener(type: string, listener: WsListener | EventListenerObject): void {
        if (typeof listener !== 'function') {
          return;
        }

        this.listeners.get(type)?.delete(listener);
      }

      /**
       * Sends data to the server
       *
       * @param data - data to send
       */
      public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        const raw = typeof data === 'string' ? data : String(data);
        const message = JSON.parse(raw) as { type: string; payload: { document?: string; data?: EditorDocumentSerialized } };

        if (message.type === MessageType.Handshake) {
          const handshakePayload = message.payload as HandshakePayload;

          // eslint-disable-next-line no-undef -- queueMicrotask is available in Node runtime
          queueMicrotask(() => {
            this.#emit('message', {
              data: JSON.stringify({
                type: MessageType.Handshake,
                payload: {
                  document: handshakePayload.document,
                  userId: handshakePayload.userId,
                  rev: 0,
                  data: handshakePayload.data,
                },
              }),
            });
          });
        }
      }

      /**
       * Deliver a server → client WebSocket payload (remote operation, etc.).
       *
       * @param payload - payload to receive from the server
       */
      public receiveFromServer(payload: unknown): void {
        this.#emit('message', { data: JSON.stringify(payload) });
      }

      /**
       * Emits event
       *
       * @param type - event type
       * @param event - event object
       */
      #emit(type: string, event: { data: string }): void {
        this.listeners.get(type)?.forEach(fn => {
          fn(event);
        });
      }
    }

    let OriginalWebSocket: typeof WebSocket;

    let connectDocumentSpy: jest.SpiedFunction<OTClient['connectDocument']>;

    let otClientFromConnect: OTClient | undefined;

    beforeEach(() => {
      otClientFromConnect = undefined;
      OriginalWebSocket = globalThis.WebSocket; // eslint-disable-line no-undef -- Node provides globalThis at runtime
      globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket; // eslint-disable-line no-undef

      const originalConnectDocument = OTClient.prototype.connectDocument;

      connectDocumentSpy = jest.spyOn(OTClient.prototype, 'connectDocument').mockImplementation(async function (this: OTClient, doc: EditorDocumentSerialized) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- capture the OTClient instance for send()
        otClientFromConnect = this;

        return originalConnectDocument.call(this, doc);
      });
    });

    afterEach(() => {
      connectDocumentSpy.mockRestore();
      globalThis.WebSocket = OriginalWebSocket; // eslint-disable-line no-undef
      MockWebSocket.lastInstance = null;
    });

    it('should not apply remote operation when it transforms to Neutral against pending local operation', async () => {
      jest.useRealTimers();

      const dataKeyValueA = createDataKey('valueA');

      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [ {
          name: 'paragraph',
          data: {
            text: {
              value: 'a',
              $t: 't',
            },
          },
        }, {
          name: 'paragraph',
          data: {
            text: {
              value: 'b',
              $t: 't',
            },
            valueA: 0,
          },
        } ],
        properties: {},
      });

      const collabConfig = {
        ...config,
        collaborationServer: collabWsUrl,
      } as Required<CoreConfig>;

      const collaborationManager = new CollaborationManager(collabConfig, model);

      collaborationManager.connect();

      const index = new IndexBuilder()
        .addDocumentId(documentId as DocumentId)
        .addBlockIndex(1)
        .addDataKey(dataKeyValueA)
        .build();

      const localOp = new Operation(OperationType.Modify, index, {
        payload: { n: 1 },
        prevPayload: null,
      }, userId);

      expect(otClientFromConnect).toBeDefined();
      const otClient = otClientFromConnect!;

      /**
       * Queue the same operation twice in OTClient:
       * - first operation is in-flight and awaits server acknowledgement
       * - second operation stays in pending operations and participates in transformation
       */
      await otClient.send(localOp);
      await otClient.send(Operation.from(localOp));

      const applySpy = jest.spyOn(collaborationManager, 'applyOperation');

      const remoteOp = new Operation(OperationType.Modify, index, {
        payload: { n: 2 },
        prevPayload: null,
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- test revision
      }, remoteUserId, 3);

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: remoteOp.serialize(),
      });

      expect(applySpy).not.toHaveBeenCalled();

      applySpy.mockRestore();

      jest.useFakeTimers();
    });
  });
});