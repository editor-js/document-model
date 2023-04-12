import { create, Nominal } from '../../../utils/Nominal';

export type DataKey = Nominal<string, 'DataKey'>;

export const createDataKey = create<DataKey>();
