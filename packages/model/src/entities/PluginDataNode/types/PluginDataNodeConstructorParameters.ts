import type { PluginDataName, PluginDataSerialized } from '@editorjs/model-types';

export interface PluginDataNodeConstructorParameters {
  /**
   * Name the data is stored under, by convention the owning plugin's `name`
   */
  name: PluginDataName;

  /**
   * Initial data of the plugin
   */
  data?: PluginDataSerialized;
}
