import { createInlineToolData, createInlineToolName } from '@editorjs/model-types';
import { InlineFormat } from './index.js';

describe('InlineFormat', () => {
  const link = createInlineToolName('link');

  it('should store the tool and data', () => {
    const data = createInlineToolData({ href: 'a' });
    const format = new InlineFormat(link, data);

    expect(format.tool).toBe(link);
    expect(format.data).toStrictEqual(data);
  });

  it('should keep its own copy of the data', () => {
    const data = { href: 'a' };
    const format = new InlineFormat(link, createInlineToolData(data));

    data.href = 'b';

    expect(format.data).toStrictEqual(createInlineToolData({ href: 'a' }));
  });

  it('should store empty data as no data', () => {
    expect(new InlineFormat(link, createInlineToolData({})).data).toBeUndefined();
  });

  it('should store missing data as no data', () => {
    expect(new InlineFormat(link).data).toBeUndefined();
  });

  describe('.equals()', () => {
    it('should return true for the same tool and equal data', () => {
      expect(new InlineFormat(link, createInlineToolData({ href: 'a' })).equals(new InlineFormat(link, createInlineToolData({ href: 'a' })))).toBe(true);
    });

    it('should return true for the same tool without data', () => {
      const bold = createInlineToolName('bold');

      expect(new InlineFormat(bold).equals(new InlineFormat(bold))).toBe(true);
    });

    it('should return false for different tools', () => {
      expect(new InlineFormat(createInlineToolName('bold')).equals(new InlineFormat(createInlineToolName('italic')))).toBe(false);
    });

    it('should return false for the same tool with different data', () => {
      expect(new InlineFormat(link, createInlineToolData({ href: 'a' })).equals(new InlineFormat(link, createInlineToolData({ href: 'b' })))).toBe(false);
    });
  });
});
