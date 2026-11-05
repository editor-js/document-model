import { createInlineToolData } from '@editorjs/model-types';
import { cloneInlineData } from './cloneInlineData.js';

describe('cloneInlineData', () => {
  it('should return an equal object', () => {
    const data = createInlineToolData({
      href: 'a',
      attributes: {
        target: '_blank',
        rel: ['noopener', 'noreferrer'],
      },
    });

    expect(cloneInlineData(data)).toStrictEqual(data);
  });

  it('should not share nested objects and arrays with the original', () => {
    const original = {
      attributes: {
        rel: ['noopener'],
      },
    };
    const copy = cloneInlineData(createInlineToolData(original)) as unknown as typeof original;

    expect(copy).not.toBe(original);
    expect(copy.attributes).not.toBe(original.attributes);
    expect(copy.attributes.rel).not.toBe(original.attributes.rel);
  });

  it('should keep primitive values', () => {
    const data = createInlineToolData({
      count: 1,
      flag: false,
      empty: null,
    });

    expect(cloneInlineData(data)).toStrictEqual(data);
  });
});
