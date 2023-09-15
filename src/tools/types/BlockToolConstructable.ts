import { BlockToolDataScheme } from './BlockToolDataScheme';

/**
 * Interface describes BlockTool static properties
 */
export interface BlockToolConstructable {
  /**
   * BlockTool data scheme to describe the structure of the data
   */
  scheme: BlockToolDataScheme;
}
