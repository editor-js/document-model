import { describe, it, expect } from '@jest/globals';
import { TextNode } from './index';
import type { BlockNode } from '../BlockNode';

describe('TextNode', () => {
  it('should create an instance', () => {
    const node = new TextNode({
      value: 'test',
      parent: {} as BlockNode,
    });

    expect(node).toBeInstanceOf(TextNode);
  });
});
