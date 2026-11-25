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

  it('keeps the default tools untouched when the user adds none', () => {
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

  it('keeps the options a user tool was registered with', () => {
    const header = toolStub('header');
    const options: ToolStaticOptions = { config: { levels: [1, 2] } };

    const result = mergeTools(defaults, {
      header: {
        class: header,
        ...options,
      },
    });

    expect(result).toContainEqual([header, options]);
  });

  it('throws when a config.tools key does not match the tool\'s static name', () => {
    const mismatched = toolStub('customParagraph');

    expect(() => mergeTools(defaults, { paragraph: mismatched })).toThrow(
      /customParagraph/
    );
  });

  it('rejects a configured tool listed under another tool\'s name', () => {
    const mismatched = toolStub('customParagraph');

    expect(() => mergeTools(defaults, { paragraph: { class: mismatched } })).toThrow(
      /customParagraph/
    );
  });
});
