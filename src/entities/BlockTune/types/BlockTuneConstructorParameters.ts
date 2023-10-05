import { BlockTuneName } from './BlockTuneName';
import { BlockTuneSerialized } from './BlockTuneSerialized';

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
