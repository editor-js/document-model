import { describe, it, expect } from '@jest/globals';
import type { ToolConstructable } from '@editorjs/sdk';
import { mergeTools } from './mergeTools.js';

/**
 * Builds a minimal tool-constructor stub carrying a static `name`.
 * @param name - the tool's registration name
 */
function toolStub(name: string): ToolConstructable {
  return { name } as unknown as ToolConstructable;
}

describe('mergeTools', () => {
  const paragraph = toolStub('paragraph');
  const bold = toolStub('bold');
  const defaults = [paragraph, bold];

  it('returns the defaults when no user tools are provided', () => {
    expect(mergeTools(defaults)).toEqual([paragraph, bold]);
  });

  it('adds a user tool registered under a new name', () => {
    const header = toolStub('header');

    const result = mergeTools(defaults, { header });

    expect(result).toContain(header);
    expect(result).toHaveLength(defaults.length + 1);
  });

  it('overrides a default tool of the same name without duplicating it', () => {
    const customParagraph = toolStub('paragraph');

    const result = mergeTools(defaults, { paragraph: customParagraph });

    expect(result).toContain(customParagraph);
    expect(result).not.toContain(paragraph);
    expect(result.filter(tool => tool.name === 'paragraph')).toHaveLength(1);
    expect(result).toHaveLength(defaults.length);
  });

  it('throws when a config.tools key does not match the tool\'s static name', () => {
    const mismatched = toolStub('customParagraph');

    expect(() => mergeTools(defaults, { paragraph: mismatched })).toThrow(
      /customParagraph/
    );
  });
});
