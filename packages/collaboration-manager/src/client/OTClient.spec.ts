/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { DocumentId, EditorDocumentSerialized } from '@editorjs/sdk';
import { createDataKey, createPluginDataName, Index } from '@editorjs/sdk';
import { beforeEach, afterEach, jest, describe, it, expect } from '@jest/globals';
import { OTClient } from './OTClient.js';
import { Operation, OperationType, type SerializedOperation } from '../Operation.js';
import type { Message } from './Message.js';
import { MessageType } from './MessageType.js';
import { MockWebSocket } from '../../test/mocks/ws.js';

const userId = 'user';
const remoteUserId = 'remote-user';
const documentId = 'document' as DocumentId;

/**
 * Minimal stub document used when connecting the OTClient to a document.
 */
/**
 * Lets the asynchronous acknowledgement handler run to completion
 */
async function flushMicrotasks(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

const stubDocument: EditorDocumentSerialized = {
  identifier: documentId,
  blocks: [],
  properties: {},
};

/**
 * Operation messages the client has put on the wire, in order
 * @param sendSpy - spy over the mock socket's send
 */
function sentOperations(sendSpy: jest.SpiedFunction<MockWebSocket['send']>): Message<SerializedOperation>[] {
  return sendSpy.mock.calls
    .map(([data]) => JSON.parse(data as string) as Message<SerializedOperation>)
    .filter(message => message.type === MessageType.Operation);
}

describe('OTClient', () => {
  let OriginalWebSocket: typeof WebSocket;

  beforeEach(() => {
    OriginalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    MockWebSocket.lastInstance = null;
  });

  afterEach(() => {
    globalThis.WebSocket = OriginalWebSocket;
    MockWebSocket.lastInstance = null;
  });

  describe('#onMessage / remote-operation handling', () => {
    it('should call onRemoteOperation with the incoming operation when there are no pending local operations', async () => {
      const onRemoteOperation = jest.fn();
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), onRemoteOperation);

      await client.connectDocument(stubDocument);

      const index = Index.text([{ blockIndex: 0,
        dataKey: createDataKey('text'),
        textRange: [0, 5],
        documentId }]);

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

      const index = Index.text([{ blockIndex: 0,
        dataKey: createDataKey('text'),
        textRange: [0, 5],
        documentId }]);

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

      const index = Index.data(1, createDataKey('valueA'), documentId);

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

    /**
     * The window a single `updatePluginData` actually lands in: the operation is sent straight
     * away, so the round trip to the server is where a collaborator's write collides with it
     */
    it('should NOT call onRemoteOperation while the only local operation is in flight', async () => {
      const onRemoteOperation = jest.fn();
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), onRemoteOperation);

      await client.connectDocument(stubDocument);

      const index = Index.pluginData(0, createPluginDataName('anchors'), 'color', documentId);

      await client.send(new Operation(OperationType.Modify, index, { payload: 'red',
        prevPayload: undefined }, userId));

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: new Operation(OperationType.Modify, index, { payload: 'blue',
          prevPayload: undefined }, remoteUserId, 1).serialize(),
      });

      /**
       * Applying it would leave this client on the collaborator's value while the server ends on
       * ours, and its own operation is never echoed back to put that right
       */
      expect(onRemoteOperation).not.toHaveBeenCalled();
    });

    it('should call onRemoteOperation once the local operation has been acknowledged', async () => {
      const onRemoteOperation = jest.fn();
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), onRemoteOperation);

      await client.connectDocument(stubDocument);

      const index = Index.pluginData(0, createPluginDataName('anchors'), 'color', documentId);

      await client.send(new Operation(OperationType.Modify, index, { payload: 'red',
        prevPayload: undefined }, userId));

      // The server echoes the local operation back with a revision, which is its acknowledgement.
      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: new Operation(OperationType.Modify, index, { payload: 'red',
          prevPayload: undefined }, userId, 1).serialize(),
      });
      await Promise.resolve();

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: new Operation(OperationType.Modify, index, { payload: 'blue',
          prevPayload: 'red' }, remoteUserId, 2).serialize(),
      });

      /**
       * The server ordered the collaborator's write after ours, so it is the one that stands
       */
      expect(onRemoteOperation).toHaveBeenCalledTimes(1);
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
      const index = Index.block(0, documentId);

      await client.send(new Operation(OperationType.Insert, index, { payload: [] }, userId));

      expect(onHandshake).toHaveBeenCalledTimes(1);
    });
  });

  describe('send', () => {
    it('should send the operation to the server as a WebSocket message', async () => {
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), jest.fn());

      await client.connectDocument(stubDocument);

      const sendSpy = jest.spyOn(MockWebSocket.lastInstance!, 'send');

      const index = Index.text([{ blockIndex: 0,
        dataKey: createDataKey('text'),
        textRange: [0, 0],
        documentId }]);

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

      const index = Index.text([{ blockIndex: 0,
        dataKey: createDataKey('text'),
        textRange: [0, 0],
        documentId }]);

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

    /**
     * Both calls reach the send path before either awaits, so the guard has to be claimed
     * before the first await or they both read the same head operation
     */
    it('should send the head operation once when two sends race', async () => {
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), jest.fn());

      await client.connectDocument(stubDocument);

      const sendSpy = jest.spyOn(MockWebSocket.lastInstance!, 'send');

      const index = Index.text([{ blockIndex: 0,
        dataKey: createDataKey('text'),
        textRange: [0, 0],
        documentId }]);

      await Promise.all([
        client.send(new Operation(OperationType.Insert, index, { payload: 'a' }, userId)),
        client.send(new Operation(OperationType.Insert, index, { payload: 'b' }, userId)),
      ]);

      expect(sentOperations(sendSpy)).toHaveLength(1);
      sendSpy.mockRestore();
    });

    it('should send the queued operation once the first is acknowledged', async () => {
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), jest.fn());

      await client.connectDocument(stubDocument);

      const sendSpy = jest.spyOn(MockWebSocket.lastInstance!, 'send');

      const index = Index.text([{ blockIndex: 0,
        dataKey: createDataKey('text'),
        textRange: [0, 0],
        documentId }]);

      const first = new Operation(OperationType.Insert, index, { payload: 'a' }, userId);

      await client.send(first);
      await client.send(new Operation(OperationType.Insert, index, { payload: 'b' }, userId));

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: new Operation(OperationType.Insert, index, { payload: 'a' }, userId, 1).serialize(),
      });
      await flushMicrotasks();

      /**
       * The acknowledgement is what releases the queue. Nothing covered that it does, which left
       * the gate free to latch shut and strand every later operation
       */
      expect(sentOperations(sendSpy)).toHaveLength(2);
      sendSpy.mockRestore();
    });

    /**
     * The guard on the acknowledgement handler now protects the pending queue, not just the
     * gate: mistaking a collaborator's operation for the acknowledgement would drop a local
     * operation that is still in flight, reopening the window remote writes are transformed in
     */
    it('should not mistake a remote operation for the acknowledgement', async () => {
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), jest.fn());

      await client.connectDocument(stubDocument);

      const sendSpy = jest.spyOn(MockWebSocket.lastInstance!, 'send');

      const index = Index.text([{ blockIndex: 0,
        dataKey: createDataKey('text'),
        textRange: [0, 0],
        documentId }]);

      await client.send(new Operation(OperationType.Insert, index, { payload: 'a' }, userId));

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: new Operation(OperationType.Insert, Index.block(5, documentId), { payload: [] }, remoteUserId, 1).serialize(),
      });
      await flushMicrotasks();

      await client.send(new Operation(OperationType.Insert, index, { payload: 'b' }, userId));

      // The first operation is still unacknowledged, so the second has to wait behind it.
      expect(sentOperations(sendSpy)).toHaveLength(1);
      sendSpy.mockRestore();
    });

    it('should still send a later operation once the queue has drained', async () => {
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), jest.fn());

      await client.connectDocument(stubDocument);

      const sendSpy = jest.spyOn(MockWebSocket.lastInstance!, 'send');

      const index = Index.text([{ blockIndex: 0,
        dataKey: createDataKey('text'),
        textRange: [0, 0],
        documentId }]);

      await client.send(new Operation(OperationType.Insert, index, { payload: 'a' }, userId));

      MockWebSocket.lastInstance!.receiveFromServer({
        type: MessageType.Operation,
        payload: new Operation(OperationType.Insert, index, { payload: 'a' }, userId, 1).serialize(),
      });
      await flushMicrotasks();

      await client.send(new Operation(OperationType.Insert, index, { payload: 'b' }, userId));

      expect(sentOperations(sendSpy)).toHaveLength(2);
      sendSpy.mockRestore();
    });
  });

  describe('close', () => {
    it('should close websocket connection', async () => {
      const client = new OTClient('ws://test-collab.invalid/document', userId, jest.fn(), jest.fn());

      await client.connectDocument(stubDocument);

      const closeSpy = jest.spyOn(MockWebSocket.lastInstance!, 'close');

      client.close();
      await Promise.resolve();

      expect(closeSpy).toHaveBeenCalledTimes(1);
      closeSpy.mockRestore();
    });
  });
});
