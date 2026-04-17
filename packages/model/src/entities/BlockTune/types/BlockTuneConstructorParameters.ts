import type { BlockTuneName } from './BlockTuneName.js';
import type { BlockTuneSerialized } from './BlockTuneSerialized.js';

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
