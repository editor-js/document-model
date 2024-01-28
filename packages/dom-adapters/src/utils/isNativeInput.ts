export enum NativeInput {
  Textarea = 'TEXTAREA',
  Input = 'INPUT',
}

export const NATIVE_INPUT_SET = new Set([NativeInput.Textarea, NativeInput.Input]) as ReadonlySet<string>;

/**
 *
 */
export function isNativeInput(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement {
  return NATIVE_INPUT_SET.has(element.tagName);
}
