export type Event<
  /**
   * Channel of the event
   */
  Channel extends string = string,
  /**
   * Name of the event
   */
  Name extends string = string
> = `${Channel}:${Name}`;
