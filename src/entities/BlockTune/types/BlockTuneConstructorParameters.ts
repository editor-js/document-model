import { BlockNode } from '../../BlockNode';
import { BlockTuneName } from './BlockTuneName';

export interface BlockTuneConstructorParameters {
  /**
   * The name of the tune
   */
  name: BlockTuneName;

  /**
   * Any additional data associated with the tune
   */
  data: Record<string, unknown>;

  /**
   * The BlockNode associated with this tune
   */
  block: BlockNode;
}
