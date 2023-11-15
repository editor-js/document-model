import { EventType } from './utils/EventBus/types/EventType.js';
import { BlockAddedEvent } from './utils/EventBus/events/index.js';
import { EditorJSModel } from './EditorJSModel.js';
import { data } from './mocks/data.js';

describe('[Integration tests] EditorJSModel', () => {
  describe('working with EditorDocument events', () => {
    let model: EditorJSModel;

    beforeEach(() => {
      model = new EditorJSModel(data);
    });

    /**
     * @todo add more cases for other events
     */
    it('should re-emit AddBlockEvent', () => {
      const handler = jest.fn();

      model.addEventListener(EventType.Changed, handler);

      model.addBlock({
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
