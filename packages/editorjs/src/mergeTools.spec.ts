import { describe, it, expect } from '@jest/globals';
import type { ToolConstructable, ToolStaticOptions } from '@editorjs/sdk';
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

  it('returns the defaults with no options when no user tools are provided', () => {
    expect(mergeTools(defaults)).toEqual([[paragraph, undefined], [bold, undefined]]);
  });

  it('adds a user tool registered under a new name', () => {
    const header = toolStub('header');

    const result = mergeTools(defaults, { header });

    expect(result).toContainEqual([header, undefined]);
    expect(result).toHaveLength(defaults.length + 1);
  });

  it('overrides a default tool of the same name without duplicating it', () => {
    const customParagraph = toolStub('paragraph');

    const result = mergeTools(defaults, { paragraph: customParagraph });

    expect(result).toContainEqual([customParagraph, undefined]);
    expect(result.filter(([tool]) => tool.name === 'paragraph')).toHaveLength(1);
    expect(result).toHaveLength(defaults.length);
  });

  it('attaches options to a user tool registered as a [tool, options] tuple', () => {
    const header = toolStub('header');
    const options: ToolStaticOptions = { config: { levels: [1, 2, 3] } };

    const result = mergeTools(defaults, { header: [header, options] });

    expect(result).toContainEqual([header, options]);
  });

  it('throws when a config.tools key does not match the tool\'s static name', () => {
    const mismatched = toolStub('customParagraph');

    expect(() => mergeTools(defaults, { paragraph: mismatched })).toThrow(
      /customParagraph/
    );
  });

  it('throws when a config.tools key does not match a tuple-registered tool\'s static name', () => {
    const mismatched = toolStub('customParagraph');

    expect(() => mergeTools(defaults, { paragraph: [mismatched, {}] })).toThrow(
      /customParagraph/
    );
  });
});
