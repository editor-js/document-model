import { DataType } from './DataType';
import { DataKey } from '../../entities';

/**
 * Block Tool data scheme to describe the structure of the data
 */
export type BlockToolDataScheme = Record<DataKey, DataType>;
