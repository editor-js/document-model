import { BlockTunesBaseEvent } from './BlockTunesBaseEvent.js';

export interface BlockTunesRenderedUIEventPayload {
  readonly blockTunes: HTMLElement;
}

export class BlockTunesRenderedUIEvent extends BlockTunesBaseEvent<BlockTunesRenderedUIEventPayload> {
  constructor(payload: BlockTunesRenderedUIEventPayload) {
    super('rendered', payload);
  }
}
