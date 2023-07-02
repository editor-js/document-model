import { createBlockNodeMock } from '../../utils/mocks/createBlockNodeMock';
import { createBlockTuneMock } from '../../utils/mocks/createBlockTuneMock';
import type { EditorDocument } from '../EditorDocument';
import { createBlockTuneName } from '../BlockTune';
import { createBlockNodeName } from './types';

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
      const blockNode = createBlockNodeMock({
        name: createBlockNodeName('paragraph'),
        data: {}, // @todo add data to this test case when TextNode and FormattingNode will have implemented .serialized method
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
        data: {},
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
