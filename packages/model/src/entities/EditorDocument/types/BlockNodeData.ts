import type { BlockNodeConstructorParameters } from '../../BlockNode/types/index.js';

/**
 * Block node data uses for creating a new BlockNode instance
 */
export type BlockNodeData = Omit<BlockNodeConstructorParameters, 'parent'>;
