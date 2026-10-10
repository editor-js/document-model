import type { BlockToolFacade } from './BlockToolFacade.js';
import type { InlineToolFacade } from './InlineToolFacade.js';

export type ToolFacadeClass = BlockToolFacade | InlineToolFacade;

export * from './BaseToolFacade.js';
export * from './BlockToolFacade.js';
export * from './InlineToolFacade.js';
