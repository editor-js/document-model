import { EditorDocumentSerialized } from '@editorjs/model';
import type { HandshakePayload } from '../../src/client/Message.js';
import { MessageType } from '../../src/client/MessageType.js';

type WsListener = (event: { data: string }) => void;

/**
 * Minimal WebSocket double so the test can act as OT server (handshake + remote ops).
 */
export class MockWebSocket {
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
