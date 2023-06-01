import { BlockTune, BlockTuneName, createBlockTuneName } from '../../entities/BlockTune';

/**
 * Creates a BlockTune instance with the given name and data.
 *
 * @param args - BlockTune constructor arguments.
 * @param args.name - The name of the tune.
 * @param args.data - Any additional data associated with the tune.
 */
export function createBlockTuneMock({ name, data }: {
  name?: BlockTuneName,
  data?: Record<string, unknown>,
}): BlockTune {
  return new BlockTune(
    {
      name: name || createBlockTuneName('aligning'),
      data: data || {},
    }
  );
}
