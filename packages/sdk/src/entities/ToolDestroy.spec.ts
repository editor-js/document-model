import { describe, expect, it, jest } from '@jest/globals';
import type { BlockTool } from './BlockTool.js';
import type { InlineTool } from './InlineTool.js';

/**
 * Builds the minimal inline tool members, so each case only adds what it checks
 */
function inlineToolBase(): Omit<InlineTool, 'destroy'> {
  return {
    isActive: () => false,
    getFormattingOptions: () => ({ action: 'format',
      range: [0, 0] }) as never,
    createWrapper: () => ({}) as HTMLElement,
    getToolbarConfig: () => ({}) as never,
  };
}

describe('Tool destroy contract', () => {
  it('should accept an inline tool that implements destroy', () => {
    const destroy = jest.fn();
    const tool: InlineTool = {
      ...inlineToolBase(),
      destroy,
    };

    tool.destroy?.();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('should accept an inline tool without destroy', () => {
    const tool: InlineTool = inlineToolBase();

    expect('destroy' in tool).toBe(false);
  });

  it('should accept a block tool that implements destroy', () => {
    const destroy = jest.fn();
    const tool: BlockTool = {
      render: () => ({}) as HTMLElement,
      destroy,
    };

    tool.destroy?.();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('should accept a block tool without destroy', () => {
    const tool: BlockTool = {
      render: () => ({}) as HTMLElement,
    };

    expect('destroy' in tool).toBe(false);
  });
});
