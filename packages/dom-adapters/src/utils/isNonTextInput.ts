enum TextInput {
  Text = 'text',
  Tel = 'tel',
  Search = 'search',
  Url = 'url',
  Password = 'password',
}

const TEXT_INPUT_SET = new Set([
  TextInput.Text,
  TextInput.Tel,
  TextInput.Search,
  TextInput.Url,
  TextInput.Password,
]) as ReadonlySet<string>;

/**
 * Checks if a given HTML input element is not a text input.
 *
 * @param {HTMLElement} element - The HTML element to check.
 * @returns {boolean} - Returns true if the element is not a text input, false otherwise.
 */
export function isNonTextInput(element: HTMLInputElement): boolean {
  return !TEXT_INPUT_SET.has(element.type);
}
