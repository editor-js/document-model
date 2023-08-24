import { jest } from '@jest/globals';
import type { ChildNode } from '../entities/interfaces';
import type { ParentNode } from '../entities/interfaces';

export const createChildNodeMock = (): ChildNode => {
  let parent: ParentNode | null = null;

  const mock = {
    appendTo: jest.fn((newParent: ParentNode) => {
      if (parent === newParent) {
        return;
      }

      parent?.removeChild(mock);

      parent = newParent;

      parent?.append(mock);
    }),
    remove: jest.fn(() => {
      parent = null;
    }),
    get parent() {
      return parent;
    },
  } as unknown as ChildNode;

  return mock;
};
