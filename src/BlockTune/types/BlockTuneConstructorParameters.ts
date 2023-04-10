import { BlockNode } from '../../BlockNode';

export interface BlockTuneConstructorParameters {
  /**
   * The name of the tune
   */
  name: string;

  /**
   * Any additional data associated with the tune
   */
  data: Record<string, unknown>;

  /**
   * The BlockNode associated with this tune
   */
  block: BlockNode;
}
