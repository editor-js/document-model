import { EventType, Index, type DataKey, type InlineToolData, type InlineToolName } from '@editorjs/model-types';
import { BlockAddedEvent } from '@editorjs/model-types';
import { EditorJSModel } from './EditorJSModel.js';
import { data } from './mocks/data.js';

describe('[Integration tests] EditorJSModel', () => {
  describe('working with EditorDocument events', () => {
    let model: EditorJSModel;

    beforeEach(() => {
      model = new EditorJSModel('user', data);
    });

    /**
     * @todo add more cases for other events
     */
    it('should emit AddBlockEvent when new block added', () => {
      const handler = jest.fn();

      model.addEventListener(EventType.Changed, handler);

      model.addBlock('user', {
        name: 'paragraph',
        data: {
          text: {
            $t: 't',
            value: 'I am a new block!',
          },
        },
      });

      expect(handler)
        .toHaveBeenCalledWith(expect.any(BlockAddedEvent));
    });
  });

  describe('.modifyData()', () => {
    const blockIndex = 0;
    const dataKey = 'text' as DataKey;
    const tool = 'link' as InlineToolName;
    const rangeEnd = 6;
    const range: [number, number] = [0, rangeEnd];
    const linkData = { href: 'https://editorjs.io' } as unknown as InlineToolData;
    let model: EditorJSModel;

    beforeEach(() => {
      model = new EditorJSModel('user', { identifier: data.identifier });
      model.initializeDocument(data);
    });

    it('should keep fragment data when re-applying a data-carrying tool', () => {
      model.format('user', blockIndex, dataKey, tool, ...range, linkData);

      model.modifyData('user', Index.text([{ blockIndex,
        dataKey,
        textRange: range }]), {
        value: {
          tool,
          data: linkData,
        },
        previous: null,
      });

      expect(model.getFragments(blockIndex, dataKey))
        .toEqual([{
          tool,
          range,
          data: linkData,
        }]);
    });
  });
});
