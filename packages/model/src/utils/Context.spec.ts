import { getContext, runWithContext, WithContext } from './Context.js';

describe('Context util', () => {
  it('should run function in context', () => {
    const func = (): string | undefined => {
      return getContext<string>();
    };

    expect(runWithContext('context', func)).toEqual('context');
  });

  it('should run several functions in context respectively', () => {
    const func = (): string | undefined => {
      return getContext<string>();
    };

    const result1 = runWithContext('context1', func);
    const result2 = runWithContext('context2', func);

    expect(result1).toEqual('context1');
    expect(result2).toEqual('context2');
  });

  it('should run method in context', () => {
    // eslint-disable-next-line jsdoc/require-jsdoc
    class Test {
      @WithContext
      // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars,jsdoc/require-jsdoc
      public method(_context: string): string | undefined {
        return getContext<string>();
      }
    }

    const instance = new Test();

    expect(instance.method('context')).toEqual('context');
  });
});
