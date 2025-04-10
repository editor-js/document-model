import type { EditorDocumentSerialized } from '@editorjs/model';
import { Operation, type SerializedOperation } from '../Operation.js';
import type { HandshakeMessage, HandshakePayload, Message, OperationMessage } from './Message.js';
import { MessageType } from './MessageType.js';

/**
 * Class to send operations to websocket server and process remote operations
 */
export class OTClient {
  /**
   * Current user identifier
   */
  #userId: string | number;

  /**
   * Current document revision
   */
  #rev: number = 0;

  /**
   * Array of pending operations to send
   */
  #pendingOperations: Operation[] = [];

  /**
   * Array of resolved operations
   */
  #resolvedOperations: Operation[] = [];

  /**
   * Promise resolving the WebSocket client
   */
  #ws: Promise<WebSocket>;

  /**
   * Promise which is resolved when handshake has happened
   */
  #handshake: Promise<void> | null = null;

  /**
   * True if operation is awaiting acknowledgment
   */
  #awaitingAcknowledgement = false;

  /**
   * Remote operation message callback
   */
  #onRemoteOperation: (op: Operation) => void;

  /**
   * Handshake callback
   */
  #onHandshake: (data?: EditorDocumentSerialized) => void;


  /**
   * Constructor function
   * - initialises socket connection
   *
   * @todo think of offline situation & retries
   * @todo handle close and error events
   *
   * @param serverAddr - address of the websocket server
   * @param userId - current user identifier
   * @param onHandshake - handshake callback
   * @param onRemoteOperation - remote operation callback
   */
  constructor(serverAddr: string, userId: string | number, onHandshake: (data?: EditorDocumentSerialized) => void, onRemoteOperation: (op: Operation) => void) {
    this.#userId = userId;
    this.#onRemoteOperation = onRemoteOperation;
    this.#onHandshake = onHandshake;
    this.#ws = new Promise(resolve => {
      const ws = new WebSocket(serverAddr);


      ws.addEventListener('open', () => {
        resolve(ws);
      });

      ws.addEventListener('message', (message) => {
        try {
          this.#onMessage(JSON.parse(message.data) as Message<SerializedOperation>);
        } catch (e) {
          console.error('[OTClient] Couldn\'t process a message', message.data);
        }
      });
    });
  }

  /**
   * Sends handshake event to the server to connect the client to passed document
   *
   * @param document - serialized document data
   */
  public async connectDocument(document: EditorDocumentSerialized): Promise<void> {
    const ws = await this.#ws;

    this.#handshake = new Promise(resolve => {
      /**
       * Handles handshake response
       *
       * @param message - server message
       */
      const onMessage = (message: MessageEvent): void => {
        try {
          const data = JSON.parse(message.data) as HandshakeMessage;

          if (data.type !== MessageType.Handshake) {
            return;
          }

          ws.removeEventListener('message', onMessage);

          this.#onHandshake(data.payload.data);

          resolve();
        } catch (e) {
          console.error('[OTClient] Couldn\'t process the handshake message', message.data);
        }
      };

      ws.addEventListener('message', onMessage);
    });

    ws.send(JSON.stringify({
      type: MessageType.Handshake,
      payload: {
        document: document.identifier,
        userId: this.#userId,
        rev: this.#rev,
        data: document,
      } as HandshakePayload,
    }));
  }

  /**
   * Adds operation to the pending operations array and schedule the send
   *
   * @param operation - operation to send
   */
  public async send(operation: Operation): Promise<void> {
    await this.#handshake;

    this.#pendingOperations.push(operation);

    await this.#sendNextOperation();
  }

  /**
   * Sends next operation from the pending ops array
   */
  async #sendNextOperation(): Promise<void> {
    if (this.#awaitingAcknowledgement) {
      return;
    }

    const nextOperation = this.#pendingOperations.shift();

    if (!nextOperation) {
      this.#awaitingAcknowledgement = false;

      return;
    }

    const ws = await this.#ws;

    this.#awaitingAcknowledgement = true;

    /**
     * Handles acknowledgment response and sends the next operation
     *
     * @param message - server message
     */
    const onMessage = async (message: MessageEvent): Promise<void> => {
      try {
        const data = JSON.parse(message.data) as Message<SerializedOperation>;

        if (data.type !== MessageType.Operation) {
          return;
        }

        if (data.payload.userId !== this.#userId) {
          return;
        }

        this.#resolvedOperations.push(nextOperation);


        ws.removeEventListener('message', onMessage);

        this.#rev = data.payload.rev;

        this.#awaitingAcknowledgement = false;
        await this.#sendNextOperation();
      } catch (e) {
        console.error('[OTClient] Couldn\'t process the acknowledgement message', message.data);
      }
    };

    ws.addEventListener('message', onMessage);

    ws.send(JSON.stringify({
      type: MessageType.Operation,
      payload: nextOperation.serialize(),
    }));
  }


  /**
   * Handles remote operations from the server
   *
   * @param message - server message with the operation payload
   */
  #onMessage(message: OperationMessage): void {
    if (message.type !== MessageType.Operation) {
      return;
    }

    if (message.payload.userId === this.#userId) {
      return;
    }

    const operation = Operation.from(message.payload);

    const transformedOperation = this.#pendingOperations.reduce((result, op) => result.transform(op), operation);

    this.#rev = operation.rev!;

    this.#onRemoteOperation(transformedOperation);
  }
}
