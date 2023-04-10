import { Nominal } from '../../../utils/Nominal';

export type DataKey = Nominal<string, 'DataKey'>;

export const createDataKey = (name: string): DataKey => (name as DataKey);
