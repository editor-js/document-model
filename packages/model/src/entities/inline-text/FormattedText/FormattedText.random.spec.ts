import type { TextOperation } from '../specs/randomOperations.testing.js';
import { createRandom, randomOperation, randomText, ReferenceText } from '../specs/randomOperations.testing.js';
import { InlineFormat } from '../InlineFormat/index.js';
import { FormattedText } from './index.js';
import { expectSpanInvariants } from './spanInvariants.testing.js';

const SEQUENCES = 200;
const OPERATIONS_PER_SEQUENCE = 30;

/**
 * Applies the operation to the FormattedText
 * @param list - FormattedText under test
 * @param operation - operation to apply
 */
function apply(list: FormattedText, operation: TextOperation): void {
  switch (operation.type) {
    case 'insert':
      list.insert(operation.text, operation.index);
      break;
    case 'remove':
      list.remove(operation.start, operation.end);
      break;
    case 'format':
      list.applyFormat(operation.start, operation.end, new InlineFormat(operation.tool, operation.data));
      break;
    case 'unformat':
      list.removeFormat(operation.start, operation.end, operation.tool);
      break;
  }
}

describe('FormattedText random operation sequences', () => {
  for (let seed = 1; seed <= SEQUENCES; seed++) {
    it(`should keep spans canonical and match the reference model (seed ${seed})`, () => {
      const random = createRandom(seed);
      const initialText = randomText(random);
      const list = new FormattedText();
      const reference = new ReferenceText(initialText);

      list.insert(initialText, 0);

      for (let step = 0; step < OPERATIONS_PER_SEQUENCE; step++) {
        const operation = randomOperation(random, reference.length);

        apply(list, operation);
        reference.apply(operation);

        expectSpanInvariants(list);
        expect(list.getText()).toBe(reference.getText());
        expect(list.toFragments()).toEqual(reference.getFragments());
      }
    });
  }
});
