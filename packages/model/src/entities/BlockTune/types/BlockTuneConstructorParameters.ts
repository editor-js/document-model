import type { BlockTuneName, BlockTuneSerialized } from '@editorjs/model-types';

export interface BlockTuneConstructorParameters {
  /**
   * The name of the tune
   */
  name: BlockTuneName;

  /**
   * Any additional data associated with the tune
   */
  data?: BlockTuneSerialized;
}
