/**
 * Enum of native input tags
 */
export enum NativeInputType {
  Textarea = 'TEXTAREA',
  Input = 'INPUT',
}

/**
 * Set of native input tags
 */
export const NATIVE_INPUT_SET = new Set(Object.values(NativeInputType)) as ReadonlySet<string>;

/**
 * Checks if the element is a native input element
 *
 * @param element - element to check
 */
export function isNativeInput(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement {
  return NATIVE_INPUT_SET.has(element.tagName);
}
