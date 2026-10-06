import { createInlineToolData, createInlineToolName } from '@editorjs/model-types';
import { Mark } from './index.js';

describe('Mark', () => {
  const link = createInlineToolName('link');

  it('should store the tool and data', () => {
    const data = createInlineToolData({ href: 'a' });
    const mark = new Mark(link, data);

    expect(mark.tool).toBe(link);
    expect(mark.data).toBe(data);
  });

  describe('.equals()', () => {
    it('should return true for the same tool and equal data', () => {
      expect(new Mark(link, createInlineToolData({ href: 'a' })).equals(new Mark(link, createInlineToolData({ href: 'a' })))).toBe(true);
    });

    it('should return true for the same tool without data', () => {
      const bold = createInlineToolName('bold');

      expect(new Mark(bold).equals(new Mark(bold))).toBe(true);
    });

    it('should return false for different tools', () => {
      expect(new Mark(createInlineToolName('bold')).equals(new Mark(createInlineToolName('italic')))).toBe(false);
    });

    it('should return false for the same tool with different data', () => {
      expect(new Mark(link, createInlineToolData({ href: 'a' })).equals(new Mark(link, createInlineToolData({ href: 'b' })))).toBe(false);
    });
  });
});
