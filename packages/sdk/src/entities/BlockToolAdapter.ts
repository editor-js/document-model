/**
 * Links Document Model to DOM
 */
export interface BlockToolAdapter {
  /**
   * Attaches input to the model using key
   * It handles beforeinput events and updates model data
   * @param keyRaw - tools data key to attach input to
   * @param input - input element
   */
  attachInput(keyRaw: string, input: HTMLElement): void;

  /**
   * Removes the input from the DOM by key
   * @param keyRaw - key of the input to remove
   */
  detachInput(keyRaw: string): void;

  /**
   * Attaches value to the model using raw data key
   * @param keyRaw - string data key used for value identification
   * @param initialValue - initial value of the value node
   * @param callback - callback function that should be used for DOM rerendering
   * @returns — function that should be used to update model
   */
  attachValue<T>(keyRaw: string, initialValue: T, callback: () => void): (newValue: T) => void;

  /**
   * Removes the value from the DOM by key
   * Detaches model value from the DOM
   * @param keyRaw - string data key used for value identification
   */
  detachValue(keyRaw: string): void;
}
