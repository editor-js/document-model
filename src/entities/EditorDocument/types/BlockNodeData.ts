import { BlockNodeConstructorParameters } from '../../BlockNode/types';

/**
 * Block node data uses for creating a new BlockNode instance
 */
export type BlockNodeData = Omit<BlockNodeConstructorParameters, 'parent'>;
