import { BlockDataType } from './BlockDataType';
import { DataKey } from '../../entities';

/**
 * Block Tool data scheme to describe the structure of the data
 */
export interface BlockToolDataScheme {
  [key: DataKey]: BlockDataType | BlockToolDataScheme | BlockDataType[] | BlockToolDataScheme[];
}
