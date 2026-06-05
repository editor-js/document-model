import { UIEventBase } from '@editorjs/sdk';

/**
 * Base event class for BlockTunes events
 */
export class BlockTunesBaseEvent<Payload = unknown> extends UIEventBase<Payload> {
  constructor(name: string, payload: Payload) {
    super(`block-tunes:${name}`, payload);
  }
}
