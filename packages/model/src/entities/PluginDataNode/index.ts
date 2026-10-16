import { getContext } from '../../utils/Context.js';
import type { PluginDataNodeConstructorParameters } from './types/index.js';
import {
  PartialIndex,
  type PluginDataSerialized,
  type PluginDataName,
  EventBus,
  PluginDataModifiedEvent
} from '@editorjs/model-types';

/**
 * Copies a plugin data record so that callers hold something of their own.
 *
 * `structuredClone` detaches the values; the top level is re-keyed onto a null prototype to
 * match the record it came from, so a key named `toString` reads as absent rather than as an
 * inherited function
 * @param data - the record to copy
 */
function detach(data: Record<string, unknown>): PluginDataSerialized {
  return Object.assign(Object.create(null) as Record<string, unknown>, structuredClone(data));
}

/**
 * PluginDataNode holds the per-block data owned by a single plugin.
 * The data is a flat key/value map: a plugin reads and writes its own keys, and every change
 * is emitted as a separate event so concurrent writes to different keys don't collide.
 */
export class PluginDataNode extends EventBus {
  /**
   * Name the data is stored under, by convention the owning plugin's `name`
   */
  #name: PluginDataName;

  /**
   * The plugin's data
   */
  #data: Record<string, unknown>;

  /**
   * Constructor for PluginDataNode class.
   * @param args - PluginDataNode constructor arguments.
   * @param args.name - Name the data is stored under.
   * @param args.data - Initial data of the plugin.
   */
  constructor({ name, data = {} }: PluginDataNodeConstructorParameters) {
    super();

    this.#name = name;

    /**
     * Copied onto a null prototype, as the block's own plugin store is: keys here are document
     * data, so a `__proto__` key loaded from a document would otherwise reach the prototype
     * setter instead of becoming an own property, and vanish from serialization. A first write
     * to a key like `toString` would also read the inherited function as its previous value and
     * put that on the undo stack
     */
    this.#data = Object.assign(Object.create(null) as Record<string, unknown>, data);
  }

  /**
   * Name the data is stored under
   */
  public get name(): PluginDataName {
    return this.#name;
  }

  /**
   * True when the node holds no keys, so the owning block can leave it out of serialization
   */
  public get isEmpty(): boolean {
    return Object.keys(this.#data).length === 0;
  }

  /**
   * Updates one key of the plugin's data. Passing `undefined` removes the key,
   * so undoing the first write to a key restores the original shape of the data.
   * @param key - The key of the data to update
   * @param value - The value to update the data with, or `undefined` to remove the key
   */
  public update(key: string, value: unknown): void {
    const previousValue = this.#data[key];

    /**
     * Storing what is already stored changes nothing, and every event here becomes an operation
     * for collaborators and a step on the undo stack. Plugins re-apply their current state
     * routinely, and an undo step that undoes nothing is worse than no step at all.
     *
     * The second clause is the removal case: both sides are `undefined` when a key holding
     * `undefined` is removed, which is a real change, and when an absent key is removed, which
     * is not.
     */
    if (Object.is(previousValue, value) && (value !== undefined || !(key in this.#data))) {
      return;
    }

    if (value === undefined) {
      delete this.#data[key];
    } else {
      this.#data[key] = value;
    }

    this.dispatchEvent(
      new PluginDataModifiedEvent(new PartialIndex({ pluginKey: key }), {
        value,
        previous: previousValue,
      }, getContext<string | number>()!)
    );
  }

  /**
   * Returns serialized version of the plugin's data.
   *
   * Detached from the node, because this is what reaches callers through `getPluginData` and
   * `api.document.data`. Handing out the live record makes read-modify-write a silent data
   * loss: the caller's edit has already changed the Model, so writing it back finds the value
   * unchanged and emits nothing -- no operation for collaborators, no step to undo
   */
  public get serialized(): PluginDataSerialized {
    return detach(this.#data);
  }
}
