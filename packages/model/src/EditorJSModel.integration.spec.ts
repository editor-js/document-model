import { EventType } from '@editorjs/model-types';
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
});
