import type { Nominal } from '../../../utils/Nominal';
import { create } from '../../../utils/Nominal';

/**
 * Base type of the data key field
 *
 * DataKeyBase is a string for object properties or a number for array indexes
 * DataKey could be a compound key path, e.g. 'dataKey.nestedArrayKey.0'
 */
type DataKeyBase = string | number;

/**
 * Nominal type for the data key field
 */
export type DataKey = Nominal<DataKeyBase, 'DataKey'>;

/**
 * Function returns a value with the nominal DataKey type
 */
export const createDataKey = create<DataKey>();
