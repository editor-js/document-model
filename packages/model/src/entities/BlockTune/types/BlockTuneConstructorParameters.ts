import type { BlockTuneName } from './BlockTuneName';
import type { BlockTuneSerialized } from './BlockTuneSerialized';

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
