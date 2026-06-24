import { BlockTunesBaseEvent } from './BlockTunesBaseEvent.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockTunesOpenUIEventPayload {}

export class BlockTunesOpenUIEvent extends BlockTunesBaseEvent<BlockTunesOpenUIEventPayload> {
  constructor(payload: BlockTunesOpenUIEventPayload) {
    super('open', payload);
  }
}
