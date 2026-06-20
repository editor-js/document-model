import { create, type Nominal } from './Nominal.js';

/** Key used for block data properties */
export type DataKey = Nominal<string | number, 'DataKey'>;

/** Function returns a value with the nominal DataKey type */
export const createDataKey = create<DataKey>();
