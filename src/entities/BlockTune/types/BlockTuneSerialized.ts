/**
 * BlockTuneSerialized represents a serialized version of a BlockTune.
 */
export interface BlockTuneSerialized {
  /**
   * The name of the tune.
   * Serialized as a string.
   */
  name: string;

  /**
   * Any additional data associated with the tune.
   */
  data: Record<string, unknown>;
}
