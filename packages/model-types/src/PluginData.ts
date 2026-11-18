import type { Nominal } from './Nominal.js';
import { create } from './Nominal.js';

/** Name a plugin's per-block data is stored under, by convention the plugin's `name` */
export type PluginDataName = Nominal<string, 'PluginDataName'>;

/** Factory for PluginDataName */
export const createPluginDataName = create<PluginDataName>();

/** Serialized per-block data of a single plugin */
export interface PluginDataSerialized {
  [key: string]: unknown;
}
