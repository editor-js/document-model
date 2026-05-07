import type { Nominal } from '../../../utils/Nominal.js';
import { create } from '../../../utils/Nominal.js';

/**
 * Base type of the block node identifier field
 */
type BlockIdBase = string;

/**
 * Nominal type for a unique block identifier
 */
export type BlockId = Nominal<BlockIdBase, 'BlockId'>;

/**
 * Accepts either a numeric block index or a block's unique string identifier.
 * Pass a number to address a block by position; pass a BlockId to address by id.
 */
export type BlockIndexOrId = number | BlockId;

/**
 * Function returns a value with the nominal BlockId type
 */
export const createBlockId = create<BlockId>();

/**
 * URL-safe alphabet used for ID generation
 */
// Stryker disable next-line StringLiteral
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/**
 * Length of generated block IDs (21 chars ≈ 126 bits of randomness, matching nanoid defaults)
 */
const ID_LENGTH = 21;

/**
 * Generates a new unique BlockId — a 21-character URL-safe random string
 */
export const generateBlockId = (): BlockId => {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));

  /* Stryker disable next-line ArithmeticOperator -- bitwise mask is intentional, not an arithmetic mutation target */
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  return createBlockId(Array.from(bytes, byte => ALPHABET[byte & 63]).join(''));
};
