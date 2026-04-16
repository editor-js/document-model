/**
 * Error for invalid or missing editor index state.
 */
export class IndexError extends Error {
  /**
   * Accepts error details and sets the name of the error to 'IndexError'
   * @param message - error details
   */
  constructor(message: string) {
    super(message);
    this.name = 'IndexError';
  }
}
