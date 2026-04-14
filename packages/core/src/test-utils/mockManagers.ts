import { jest } from '@jest/globals';

export type BlocksManagerMock = {
  clear: jest.Mock;
  render: jest.Mock;
  deleteBlock: jest.Mock;
  move: jest.Mock;
  insertMany: jest.Mock;
  insert: jest.Mock;
  blocksCount: number;
};

export const createBlocksManagerMock = (blocksCount: number = 5): BlocksManagerMock => ({
  clear: jest.fn(),
  render: jest.fn(),
  deleteBlock: jest.fn(),
  move: jest.fn(),
  insertMany: jest.fn(),
  insert: jest.fn(),
  blocksCount,
});

export type SelectionManagerMock = {
  applyInlineToolForCurrentSelection: jest.Mock;
};

export const createSelectionManagerMock = (): SelectionManagerMock => ({
  applyInlineToolForCurrentSelection: jest.fn(),
});



