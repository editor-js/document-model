import { create, Nominal } from '../../../utils/Nominal';

/**
 * Base type of the value node name field
 */
type ValueNodeNameBase = string;

/**
 * Nominal type for the value node name field
 */
export type ValueNodeName = Nominal<ValueNodeNameBase, 'ValueNodeName'>;

/**
 * Function returns a value with the nominal ValueNodeName type
 */
export const createValueNodeName = create<ValueNodeName>();
