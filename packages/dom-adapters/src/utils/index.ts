export * from './getAbsoluteRangeOffset.js';
export * from './getRelativeIndex.js';

export enum NativeInput {
  Textarea = 'TEXTAREA',
  Input = 'INPUT',
}

export enum InputMode {
  Native = 'native',
  ContentEditable = 'contenteditable',
}

const NATIVE_INPUT_SET = new Set([NativeInput.Textarea, NativeInput.Input]) as ReadonlySet<string>;

/**
 *
 * @param input
 */
export function isNativeInput(input: HTMLElement): input is HTMLInputElement | HTMLTextAreaElement {
  return NATIVE_INPUT_SET.has(input.tagName);
}
