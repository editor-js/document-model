enum TextInput {
  text = 'text', 
  tel = 'tel',
  search = 'search',
  url = 'url',
  password = 'password',
}

const TEXT_INPUT_SET = new Set([
  TextInput.text,
  TextInput.tel,
  TextInput.search,
  TextInput.url,
  TextInput.password
]) as ReadonlySet<string>;

/**
 * Checks if a given HTML input element is not a text input.
 * @param {HTMLElement} element - The HTML element to check.
 * @returns {boolean} - Returns true if the element is not a text input, false otherwise.
 */
export function isNonTextInput(element: HTMLInputElement): boolean {
  return !TEXT_INPUT_SET.has(element.type);
}
