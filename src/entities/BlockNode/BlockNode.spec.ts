import { createBlockNodeMock } from '../../utils/mocks/createBlockNodeMock';
import { createBlockTuneMock } from '../../utils/mocks/createBlockTuneMock';
import type { EditorDocument } from '../EditorDocument';
import type { BlockNode } from './index';
import { createBlockTuneName } from '../BlockTune';
import { createBlockNodeName, createDataKey } from './types';
import { TextNode } from '../TextNode';
import { createValueNodeMock } from '../../utils/mocks/createValueNodeMock';

describe('BlockNode', () => {
  describe('.serialized', () => {
    it('should return serialized object representing the BlockNode', () => {
      // Arrange
      const tune = createBlockTuneMock({
        name: createBlockTuneName('styling'),
        data: {
          background: 'transparent',
        },
      });

      const textNodeDataKey = createDataKey('data-key-1a2b');
      const textNode = new TextNode({
        value: 'Hello world!',
        parent: {} as BlockNode,
      });

      const valueNodeDataKey = createDataKey('data-key-3c4d');
      const valueNode = createValueNodeMock({
        value: 'https://codex.so',
      });

      const blockNode = createBlockNodeMock({
        name: createBlockNodeName('paragraph'),
        data: {
          [textNodeDataKey]: [ textNode ],
          [valueNodeDataKey]: valueNode,
        },
        tunes: {
          [createBlockTuneName('styling')]: tune,
        },
        parent: {} as EditorDocument,
      });

      // Act
      const serialized = blockNode.serialized;

      // Assert
      expect(serialized).toEqual({
        name: 'paragraph',
        data: {
          [textNodeDataKey]: [ textNode.serialized ],
          [valueNodeDataKey]: valueNode.serialized,
        },
        tunes: {
          'styling': {
            name: 'styling',
            data: {
              background: 'transparent',
            },
          },
        },
      });
    });
  });
});
