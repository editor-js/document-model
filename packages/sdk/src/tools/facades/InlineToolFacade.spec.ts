/* eslint-disable jsdoc/require-jsdoc */

import { describe, expect, it, jest } from '@jest/globals';
import type { InlineToolConstructor } from '../../entities/index.js';
import { ToolType } from '../../entities/index.js';
import type { ToolOptions } from './BaseToolFacade.js';
import { InlineToolFacade } from './InlineToolFacade.js';
import type { EditorAPI } from '../../api';

/**
 * Facade under test, with a record of how many instances its tool class constructed
 */
interface Probe {
  facade: InlineToolFacade;
  constructed: jest.Mock;
}

/**
 * Creates a facade around an inline tool class whose instances record their construction and destruction
 * @param destroy - the instances' destroy() hook, or undefined for a tool without one
 */
function createFacade(destroy?: () => void): Probe {
  const constructed = jest.fn();

  class MockInlineTool {
    public static type = ToolType.Inline;

    public destroy = destroy;

    constructor() {
      constructed();
    }
  }

  const facade = new InlineToolFacade({
    api: {} as EditorAPI,
    constructable: MockInlineTool as unknown as InlineToolConstructor,
    isDefault: false,
    name: 'probe',
    useToolOptions: {} as ToolOptions,
  });

  return { facade,
    constructed };
}

describe('InlineToolFacade', () => {
  it('should return the same instance from every create()', () => {
    const { facade, constructed } = createFacade();

    expect(facade.create()).toBe(facade.create());
    expect(constructed).toHaveBeenCalledTimes(1);
  });

  it('should call the instance\'s destroy() once on destroy', () => {
    const destroy = jest.fn();
    const { facade } = createFacade(destroy);

    facade.create();
    facade.destroy();
    facade.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('should not construct an instance on destroy when none was created', () => {
    const { facade, constructed } = createFacade(jest.fn());

    facade.destroy();

    expect(constructed).not.toHaveBeenCalled();
  });

  it('should support a tool without destroy()', () => {
    const { facade } = createFacade();

    facade.create();

    expect(() => facade.destroy()).not.toThrow();
  });

  it('should drop the instance even when its destroy() throws', () => {
    const destroy = jest.fn(() => {
      throw new Error('broken tool');
    });
    const { facade } = createFacade(destroy);

    facade.create();

    expect(() => facade.destroy()).toThrow('broken tool');

    facade.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
