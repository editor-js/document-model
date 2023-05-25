import { BlockTuneName } from './BlockTuneName';

/**
 * BlockTuneSerialized represents a serialized version of a BlockTune.
 */
export interface BlockTuneSerialized {
  /**
   * The name of the tune.
   */
  name: BlockTuneName;

  /**
   * Any additional data associated with the tune.
   */
  data: Record<string, unknown>;
}
