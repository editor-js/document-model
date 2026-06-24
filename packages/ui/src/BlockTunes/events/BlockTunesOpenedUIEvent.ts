import { BlockTunesBaseEvent } from './BlockTunesBaseEvent.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockTunesOpenedUIEventPayload {}

export class BlockTunesOpenedUIEvent extends BlockTunesBaseEvent<BlockTunesOpenedUIEventPayload> {
  constructor(payload: BlockTunesOpenedUIEventPayload) {
    super('opened', payload);
  }
}
