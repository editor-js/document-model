/**
 * Links Document Model to DOM
 */
export interface BlockToolAdapter {
  /**
   * Attaches input to the model using key
   * It handles beforeinput events and updates model data
   *
   * @param keyRaw - tools data key to attach input to
   * @param input - input element
   */
  attachInput(keyRaw: string, input: HTMLElement): void;
}
