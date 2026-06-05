import { BlockTunesBaseEvent } from './BlockTunesBaseEvent.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockTunesClosedUIEventPayload {}

export class BlockTunesClosedUIEvent extends BlockTunesBaseEvent<BlockTunesClosedUIEventPayload> {
  constructor(payload: BlockTunesClosedUIEventPayload) {
    super('closed', payload);
  }
}
