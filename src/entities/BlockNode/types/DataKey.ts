import { create, Nominal } from '../../../utils/Nominal';

/**
 * Base type of the data key field
 */
type DataKeyBase = string;

/**
 * Nominal type for the data key field
 */
export type DataKey = Nominal<DataKeyBase, 'DataKey'>;

/**
 * Function returns a value with the nominal DataKey type
 */
export const createDataKey = create<DataKey>();
