/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { DocumentId, EditorDocumentSerialized } from '@editorjs/model';
import { createDataKey, IndexBuilder } from '@editorjs/model';
import { beforeEach, afterEach, jest, describe, it, expect } from '@jest/globals';
import { OTClient } from './OTClient.js';
import { Operation, OperationType } from '../Operation.js';
import { MessageType } from './MessageType.js';
import { MockWebSocket } from '../../test/mocks/ws.js';

const userId = 'user';
const remoteUserId = 'remote-user';
const documentId = 'document' as DocumentId;

/**
 * Minimal stub document used when connecting the OTClient to a document.
 */
const stubDocument: EditorDocumentSerialized = {
  identifier: documentId,
  blocks: [],
  properties: {},
};

describe('OTClient', () => {
  let OriginalWebSocket: typeof WebSocket;

  beforeEach(() => {
    OriginalWebSocket = globalThis.WebSocket; // eslint-disable-line no-undef
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket; // eslint-disable-line no-undef
    MockWebSocket.lastInstance = null;
  });

  afterEach(() => {
    globalThis.WebSocket = OriginalWebSocket; // eslint-disable-line no-undef
    MockWebSocket.lastInstance = null;
  });

  describe('#onMessage / remote-operation handling', () => {
    it('should call onRemoteOperation with the incoming operation when there are no pending local operations', async () => {
      const onRemoteOperation = jest.fn();
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), onRemoteOperation);

      await client.connectDocument(stubDocument);

      const index = new IndexBuilder()
        .addDocumentId(documentId)
        .addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 5])
        .build();

      const remoteOp = new Operation(OperationType.Insert, index, { payload: 'hello' }, remoteUserId, 1);

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: remoteOp.serialize(),
      });

      expect(onRemoteOperation).toHaveBeenCalledTimes(1);
      expect(onRemoteOperation).toHaveBeenCalledWith(expect.objectContaining({ type: OperationType.Insert }));
    });

    it('should NOT call onRemoteOperation when the remote operation is from the current user', async () => {
      const onRemoteOperation = jest.fn();
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), onRemoteOperation);

      await client.connectDocument(stubDocument);

      const index = new IndexBuilder()
        .addDocumentId(documentId)
        .addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 5])
        .build();

      // Same userId as the local user — should be ignored
      const ownOp = new Operation(OperationType.Insert, index, { payload: 'hello' }, userId, 1);

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: ownOp.serialize(),
      });

      expect(onRemoteOperation).not.toHaveBeenCalled();
    });

    it('should NOT call onRemoteOperation when remote operation transforms to Neutral against a pending local operation', async () => {
      const onRemoteOperation = jest.fn();
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), onRemoteOperation);

      await client.connectDocument(stubDocument);

      const index = new IndexBuilder()
        .addDocumentId(documentId)
        .addBlockIndex(1)
        .addDataKey(createDataKey('valueA'))
        .build();

      const localOp = new Operation(OperationType.Modify, index, {
        payload: { n: 1 },
        prevPayload: null,
      }, userId);

      // First send is in-flight (awaiting server acknowledgement).
      await client.send(localOp);
      // Second send stays in #pendingOperations (first is still unacknowledged).
      await client.send(Operation.from(localOp));

      // Remote Modify on the same index — transforms to Neutral against the pending op.
      const remoteOp = new Operation(OperationType.Modify, index, {
        payload: { n: 2 },
        prevPayload: null,
      }, remoteUserId, 3);

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: remoteOp.serialize(),
      });

      expect(onRemoteOperation).not.toHaveBeenCalled();
    });

    it('should ignore messages with type other than Operation', async () => {
      const onRemoteOperation = jest.fn();
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), onRemoteOperation);

      await client.connectDocument(stubDocument);

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Handshake,
        payload: {
          document: documentId,
          userId: remoteUserId,
          rev: 0,
        },
      });

      expect(onRemoteOperation).not.toHaveBeenCalled();
    });
  });

  describe('connectDocument', () => {
    it('should send a handshake packet to the server', async () => {
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), jest.fn());

      const sendSpy = jest.spyOn(MockWebSocket.prototype, 'send');

      await client.connectDocument(stubDocument);

      const handshakeCall = sendSpy.mock.calls.find(([data]) =>
        typeof data === 'string' && (JSON.parse(data) as { type: MessageType }).type === MessageType.Handshake
      );

      expect(handshakeCall).toBeDefined();

      sendSpy.mockRestore();
    });

    it('should call onHandshake with the document data returned by the server', async () => {
      const onHandshake = jest.fn();
      const client = new OTClient('ws://test-collab.invalid/document', userId, onHandshake, jest.fn());

      await client.connectDocument(stubDocument);

      // Awaiting send() lets the handshake-reply microtask run and #handshake resolve,
      // which triggers onHandshake.
      const index = new IndexBuilder().addDocumentId(documentId)
        .addBlockIndex(0)
        .build();

      await client.send(new Operation(OperationType.Insert, index, { payload: [] }, userId));

      expect(onHandshake).toHaveBeenCalledTimes(1);
    });
  });

  describe('send', () => {
    it('should send the operation to the server as a WebSocket message', async () => {
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), jest.fn());

      await client.connectDocument(stubDocument);

      const sendSpy = jest.spyOn(MockWebSocket.lastInstance!, 'send');

      const index = new IndexBuilder()
        .addDocumentId(documentId)
        .addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 0])
        .build();

      const op = new Operation(OperationType.Insert, index, { payload: 'x' }, userId);

      await client.send(op);

      const opCall = sendSpy.mock.calls.find(([data]) =>
        typeof data === 'string' && (JSON.parse(data) as { type: MessageType }).type === MessageType.Operation
      );

      expect(opCall).toBeDefined();
      sendSpy.mockRestore();
    });

    it('should queue a second operation while the first is awaiting acknowledgement', async () => {
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), jest.fn());

      await client.connectDocument(stubDocument);

      const sendSpy = jest.spyOn(MockWebSocket.lastInstance!, 'send');

      const index = new IndexBuilder()
        .addDocumentId(documentId)
        .addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 0])
        .build();

      const op1 = new Operation(OperationType.Insert, index, { payload: 'a' }, userId);
      const op2 = new Operation(OperationType.Insert, index, { payload: 'b' }, userId);

      await client.send(op1);
      await client.send(op2);

      // Only one Operation message should have been sent to the server (op1 is in-flight, op2 queued).
      const opCalls = sendSpy.mock.calls.filter(([data]) =>
        typeof data === 'string' && (JSON.parse(data) as { type: MessageType }).type === MessageType.Operation
      );

      expect(opCalls).toHaveLength(1);
      sendSpy.mockRestore();
    });
  });
});
