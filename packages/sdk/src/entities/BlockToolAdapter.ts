/**
 * Links Document Model to DOM
 */
export interface BlockToolAdapter {
  /**
   * Registers a callback that will be called when a text or value node is added to the model.
   * The callback should create, mount, and return the corresponding DOM element.
   *
   * @param callback - receives the data key and node type, returns the created element
   */
  onUpdate(callback: (key: string, type: 'text' | 'value') => HTMLElement): void;

  /**
   * Initializes the adapter with the tool instance and the update callback.
   * Scans existing model data and calls onTextNodeAdded for each existing text node.
   *
   * @param tool - the block tool instance
   * @param onUpdateCallback - callback to create DOM elements for data nodes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init(tool: any, onUpdateCallback: (key: string, type: 'text' | 'value') => HTMLElement): void;

  /**
   * Attaches input to the model using key.
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
   * @param callback - callback function that receives the updated value and should be used for DOM rerendering
   * @returns — function that should be used to update model
   */
  attachValue<T>(keyRaw: string, initialValue: T, callback: (value: T) => void): (newValue: T) => void;

  /**
   * Removes the value node from the model by key
   * @param keyRaw - string data key used for value identification
   */
  detachValue(keyRaw: string): void;

  /**
   * Registers a data key with the model, creating a DataNode if it doesn't already exist.
   * Use this to declare inputs/values that the tool owns before rendering.
   *
   * @param keyRaw - string data key to register
   * @param type - node type: 'text' for contenteditable inputs, 'value' for arbitrary values
   * @param initialData - optional initial data for the node
   */
  registerKey(keyRaw: string, type: 'text' | 'value', initialData?: unknown): void;
}
