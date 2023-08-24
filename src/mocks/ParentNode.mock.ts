import { jest } from '@jest/globals';
import type { ParentNode } from '../entities/inline-fragments';

export const createParentNodeMock = (): ParentNode => ({
  insertAfter: jest.fn(),
  removeChild: jest.fn(),
  append: jest.fn(),
  children: [],
} as unknown as ParentNode);
