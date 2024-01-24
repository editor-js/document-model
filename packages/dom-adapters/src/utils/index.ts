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

export const NATIVE_INPUT_SET = new Set([NativeInput.Textarea, NativeInput.Input]) as ReadonlySet<string>;
