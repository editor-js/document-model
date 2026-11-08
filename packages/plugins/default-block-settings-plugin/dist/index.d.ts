import type { EditorjsPlugin, EditorjsPluginParams } from '@editorjs/sdk';
import { PluginType } from '@editorjs/sdk';
/**
 * Supplies the default entries of the block settings menu -- Move up, Move down and Delete --
 * as an ordinary plugin registered with the `block-settings` API.
 *
 * Nothing here is privileged: this is the reference example of what used to be a "block tune",
 * written the way any third-party plugin would write it.
 */
export declare class DefaultBlockSettingsPlugin implements EditorjsPlugin {
    #private;
    /**
     * Registers with `core.use` under {@link PluginType.Plugin}
     */
    static readonly type = PluginType.Plugin;
    /**
     * Identifier the editor registers this plugin under
     */
    static readonly name = "default-block-settings";
    /**
     * DefaultBlockSettingsPlugin class constructor
     * @param params - plugin parameters
     */
    constructor({ api, eventBus }: EditorjsPluginParams);
    /**
     * Takes the provider back out of the menu.
     *
     * The ready listener goes too: the bus outlives the plugin, and a plugin destroyed before
     * the editor finished starting would otherwise register a provider afterwards -- one nothing
     * holds the unregister function for
     */
    destroy(): void;
}
//# sourceMappingURL=index.d.ts.map