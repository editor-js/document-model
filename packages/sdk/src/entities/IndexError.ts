/**
 * Error for invalid or missing editor index state.
 */
export class IndexError extends Error {
  /**
   * IndexError constructor
   * @param message - error details
   */
  constructor(message: string) {
    super(message);
    this.name = 'IndexError';
  }
}
