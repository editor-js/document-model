import type { TextOperation } from '../specs/randomOperations.testing.js';
import { createRandom, randomOperation, randomText, ReferenceText, shuffle } from '../specs/randomOperations.testing.js';
import { TextNode } from './index.js';

const SEQUENCES = 200;
const OPERATIONS_PER_SEQUENCE = 30;

/**
 * Applies the operation to the TextNode
 * @param node - TextNode under test
 * @param operation - operation to apply
 */
function apply(node: TextNode, operation: TextOperation): void {
  switch (operation.type) {
    case 'insert':
      node.insertText(operation.text, operation.index);
      break;
    case 'remove':
      node.removeText(operation.start, operation.end);
      break;
    case 'format':
      node.format(operation.tool, operation.start, operation.end, operation.data);
      break;
    case 'unformat':
      node.unformat(operation.tool, operation.start, operation.end);
      break;
  }
}

describe('TextNode random operation sequences', () => {
  for (let seed = 1; seed <= SEQUENCES; seed++) {
    it(`should match the per-character reference model (seed ${seed})`, () => {
      const random = createRandom(seed);
      const initialText = randomText(random);
      const node = new TextNode({ value: initialText });
      const reference = new ReferenceText(initialText);

      for (let step = 0; step < OPERATIONS_PER_SEQUENCE; step++) {
        const operation = randomOperation(random, reference.length);

        apply(node, operation);
        reference.apply(operation);

        expect(node.getText()).toBe(reference.getText());
        expect(node.getFragments()).toEqual(reference.getFragments());
      }

      const { value, fragments } = node.serialized;
      const reloaded = new TextNode({
        value,
        fragments,
      });
      const shuffled = new TextNode({
        value,
        fragments: shuffle(random, fragments),
      });

      expect(reloaded.getFragments()).toEqual(fragments);
      expect(shuffled.getFragments()).toEqual(fragments);
    });
  }
});
