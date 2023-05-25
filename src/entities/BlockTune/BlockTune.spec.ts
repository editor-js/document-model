import { BlockTune, BlockTuneName, createBlockTuneName } from './index';
import { BlockNode, createBlockNodeName } from '../BlockNode';
import { EditorDocument } from '../EditorDocument';

const createBlockTune = ({ name, data, block }: {
  name?: BlockTuneName,
  data: Record<string, unknown>,
  block?: BlockNode,
}): BlockTune => {
  const document = new EditorDocument({
    children: [],
    properties: {
      readOnly: false,
    },
  });

  const blockNode = block || new BlockNode({
    name: createBlockNodeName('block'),
    children: {},
    parent: document,
  });

  document.addBlock(blockNode);

  return new BlockTune(
    {
      name: name || createBlockTuneName('blockTune'),
      data,
      block: blockNode,
    }
  );
};

describe('BlockTune', () => {
  describe('update method', () => {
    it('should add field to data object by key if it doesn\'t exist', () => {
      // Arrange
      const blockTune = createBlockTune({
        data: {},
      });

      // Act
      blockTune.update('test', 'test');

      // Assert
      expect(blockTune.serialized.data).toEqual({
        test: 'test',
      });
    });

    it('should update field in data object by key', () => {
      // Arrange
      const blockTune = createBlockTune({
        data: {
          test: 'test',
        },
      });

      // Act
      blockTune.update('test', 'newTest');

      // Assert
      expect(blockTune.serialized.data).toEqual({
        test: 'newTest',
      });
    });
  });

  it('should return serialized version of the BlockTune', () => {
    // Arrange
    const expected = {
      name: createBlockTuneName('blockTune'),
      data: {
        test: 'test',
      },
    };

    // Act
    const actual = createBlockTune({
      name: expected.name,
      data: expected.data,
    }).serialized;

    // Assert
    expect(actual).toEqual(expected);
  });
});
