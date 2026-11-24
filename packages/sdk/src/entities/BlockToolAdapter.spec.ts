/* eslint-disable jsdoc/require-jsdoc */

import { describe, expect, it, jest } from '@jest/globals';
import type { CoreConfig } from './Config.js';
import type { EditorAPI } from '../api/index.js';
import type { BlockId, EventBus, ModelEvents } from '@editorjs/model-types';
import { BlockToolAdapter } from './BlockToolAdapter.js';

const MODEL_EVENT = 'model:update';
const BUS_EVENT = 'ui:probe';

/**
 * Adapter subclass that registers its own listener with the inherited signal
 */
class ProbeAdapter extends BlockToolAdapter {
  public readonly modelUpdates = jest.fn();

  public readonly busEvents = jest.fn();

  constructor(config: Required<CoreConfig>, api: EditorAPI, eventBus: EventBus) {
    super(config, api, eventBus);

    eventBus.addEventListener(BUS_EVENT, () => this.busEvents(), { signal: this.signal });
  }

  protected handleModelUpdate(event: ModelEvents): void {
    this.modelUpdates(event);
  }
}

/**
 * Adapter under test with the targets standing in for the model and the EventBus
 */
interface Harness {
  adapter: ProbeAdapter;
  model: EventTarget;
  eventBus: EventTarget;
}

/**
 * Creates an adapter wired to real EventTargets standing in for the model and the EventBus
 */
function createAdapter(): Harness {
  const model = new EventTarget();
  const eventBus = new EventTarget();
  const blockId = 'block' as BlockId;

  const api = {
    document: {
      onUpdate: (callback: EventListener) => {
        const controller = new AbortController();

        model.addEventListener(MODEL_EVENT, callback, { signal: controller.signal });

        return () => controller.abort();
      },
    },
    blocks: {
      getIdByIndex: () => blockId,
    },
  } as unknown as EditorAPI;

  const adapter = new ProbeAdapter({} as Required<CoreConfig>, api, eventBus as EventBus);

  adapter.setBlockId(blockId);

  return { adapter,
    model,
    eventBus };
}

/**
 * Model event shaped enough for the adapter's index check
 */
function modelEvent(): Event {
  return Object.assign(new Event(MODEL_EVENT), { detail: { index: { blockIndex: 0 } } });
}

describe('BlockToolAdapter', () => {
  it('should handle model updates before destroy', () => {
    const { adapter, model } = createAdapter();

    model.dispatchEvent(modelEvent());

    expect(adapter.modelUpdates).toHaveBeenCalledTimes(1);
  });

  it('should stop handling model updates after destroy', () => {
    const { adapter, model } = createAdapter();

    adapter.destroy();
    model.dispatchEvent(modelEvent());

    expect(adapter.modelUpdates).not.toHaveBeenCalled();
  });

  it('should remove a subclass listener registered with the inherited signal on destroy', () => {
    const { adapter, eventBus } = createAdapter();

    eventBus.dispatchEvent(new Event(BUS_EVENT));
    adapter.destroy();
    eventBus.dispatchEvent(new Event(BUS_EVENT));

    expect(adapter.busEvents).toHaveBeenCalledTimes(1);
  });

  it('should abort the inherited signal on destroy', () => {
    const { adapter } = createAdapter();

    adapter.destroy();

    expect((adapter as unknown as { signal: AbortSignal }).signal.aborted).toBe(true);
  });
});
