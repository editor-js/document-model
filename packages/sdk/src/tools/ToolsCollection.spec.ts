/* eslint-disable jsdoc/require-jsdoc -- inline test stubs */

import { describe, expect, it } from '@jest/globals';
import { ToolType } from '../entities/index.js';
import type { ToolFacadeClass } from './facades/index.js';
import { ToolsCollection } from './ToolsCollection.js';

/**
 * Stands in for a registered facade: `ToolsCollection` filters purely on the kind
 * predicates, so a bare object carrying `type` and those predicates is enough.
 * @param name - name the facade is registered under
 * @param type - kind the facade reports
 */
function facadeStub(name: string, type: ToolType): [string, ToolFacadeClass] {
  const facade = {
    name,
    type,
    isBlock: () => type === ToolType.Block,
    isInline: () => type === ToolType.Inline,
  };

  return [name, facade as unknown as ToolFacadeClass];
}

describe('ToolsCollection', () => {
  const collection = new ToolsCollection([
    facadeStub('paragraph', ToolType.Block),
    facadeStub('header', ToolType.Block),
    facadeStub('bold', ToolType.Inline),
  ]);

  it('should return only block tool facades from blockTools', () => {
    expect([...collection.blockTools.keys()]).toEqual(['paragraph', 'header']);
  });

  it('should return only inline tool facades from inlineTools', () => {
    expect([...collection.inlineTools.keys()]).toEqual(['bold']);
  });

  it('should expose no view beyond blockTools and inlineTools', () => {
    /*
     * Own getters live on the prototype, so the collection's kind views are read from
     * there rather than from the instance.
     */
    const views = Object
      .entries(Object.getOwnPropertyDescriptors(ToolsCollection.prototype))
      .filter(([, descriptor]) => descriptor.get !== undefined)
      .map(([key]) => key);

    expect(views.sort()).toEqual(['blockTools', 'inlineTools']);
  });

  it('should no longer expose a blockTunes view', () => {
    type CollectionViews = {
      // @ts-expect-error -- `blockTunes` went with the tune tool kind
      blockTunes: ToolsCollection['blockTunes'];
    };

    const probe: CollectionViews | undefined = undefined;

    expect(probe).toBeUndefined();
  });
});
