import { create, type Nominal } from './Nominal.js';

/** Unique identifier for a block */
export type BlockId = Nominal<string, 'BlockId'>;

/** Union representing either a numeric index or a block identifier */
export type BlockIndexOrId = number | BlockId;

/** Name of a block tool */
export type BlockToolName = Nominal<string, 'BlockToolName'>;

/** Factory for BlockToolName */
export const createBlockToolName = create<BlockToolName>();

/** Function returns a value with the nominal BlockId type */
export const createBlockId = create<BlockId>();

/**
 * URL-safe alphabet used for ID generation
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

const ID_LENGTH = 21;

/**
 * Bitmask selecting a character from the 64-character ALPHABET via a single random byte
 */
const ALPHABET_MASK = ALPHABET.length - 1;

/** Generates a new unique BlockId */
export const generateBlockId = (): BlockId => {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));

  return createBlockId(Array.from(bytes, byte => ALPHABET[byte & ALPHABET_MASK]).join(''));
};
