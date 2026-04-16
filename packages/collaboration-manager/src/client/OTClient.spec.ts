import type { DocumentId, EditorDocumentSerialized } from '@editorjs/model';
import { createDataKey, EditorJSModel, IndexBuilder } from '@editorjs/model';
import { beforeEach, afterEach, jest } from '@jest/globals';
import type { CoreConfig } from '@editorjs/sdk';
import { MessageType } from './MessageType.js';
import { OTClient } from './OTClient.js';
import { CollaborationManager } from '../CollaborationManager.js';
import { Operation, OperationType } from '../Operation.js';
import { MockWebSocket } from '../../test/mocks/ws.js';

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
