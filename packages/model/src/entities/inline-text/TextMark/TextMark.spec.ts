import { createInlineToolData, createInlineToolName } from '@editorjs/model-types';
import { TextMark } from './index.js';

describe('TextMark', () => {
  const link = createInlineToolName('link');

  it('should store the tool and data', () => {
    const data = createInlineToolData({ href: 'a' });
    const mark = new TextMark(link, data);

    expect(mark.tool).toBe(link);
    expect(mark.data).toStrictEqual(data);
  });

  it('should keep its own copy of the data', () => {
    const data = { href: 'a' };
    const mark = new TextMark(link, createInlineToolData(data));

    data.href = 'b';

    expect(mark.data).toStrictEqual(createInlineToolData({ href: 'a' }));
  });

  it('should store empty data as no data', () => {
    expect(new TextMark(link, createInlineToolData({})).data).toBeUndefined();
  });

  it('should store missing data as no data', () => {
    expect(new TextMark(link).data).toBeUndefined();
  });

  describe('.equals()', () => {
    it('should return true for the same tool and equal data', () => {
      expect(new TextMark(link, createInlineToolData({ href: 'a' })).equals(new TextMark(link, createInlineToolData({ href: 'a' })))).toBe(true);
    });

    it('should return true for the same tool without data', () => {
      const bold = createInlineToolName('bold');

      expect(new TextMark(bold).equals(new TextMark(bold))).toBe(true);
    });

    it('should return false for different tools', () => {
      expect(new TextMark(createInlineToolName('bold')).equals(new TextMark(createInlineToolName('italic')))).toBe(false);
    });

    it('should return false for the same tool with different data', () => {
      expect(new TextMark(link, createInlineToolData({ href: 'a' })).equals(new TextMark(link, createInlineToolData({ href: 'b' })))).toBe(false);
    });
  });
});
