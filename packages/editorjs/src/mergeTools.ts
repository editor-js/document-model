import type { ToolConstructable, ToolStaticOptions } from '@editorjs/sdk';

/**
 * A user tool entry in `config.tools`: a bare constructor, or a
 * `[constructor, options]` tuple when `core.use` needs a second argument
 * (most commonly `{ config }`).
 */
export type ToolEntry = ToolConstructable | [ToolConstructable, ToolStaticOptions];

/**
 * A merged tool paired with the options it should be passed to `core.use` with,
 * if any.
 */
export type MergedTool = [ToolConstructable, ToolStaticOptions | undefined];

/**
 * Merges user-provided tools over the default tools, keyed by name.
 *
 * Defaults are keyed by their static `name`; user tools are keyed by their map
 * key. A user tool whose key matches a default's name replaces that default
 * instead of registering a duplicate (override-by-name).
 * @param defaults - the bundle's default tool constructors
 * @param userTools - tools from `config.tools`, keyed by tool name
 * @throws {Error} if a `userTools` key doesn't match its tool's static `name`,
 * since the core registers/looks up tools by `name`, not by the map key
 */
export function mergeTools(
  defaults: ToolConstructable[],
  userTools?: Record<string, ToolEntry>
): MergedTool[] {
  const merged = new Map<string, MergedTool>();

  for (const tool of defaults) {
    merged.set(tool.name, [tool, undefined]);
  }

  if (userTools !== undefined) {
    for (const [name, entry] of Object.entries(userTools)) {
      const [tool, options] = Array.isArray(entry) ? entry : [entry, undefined];

      if (name !== tool.name) {
        throw new Error(
          `Tool registered under key "${name}" in config.tools has a static name of "${tool.name}". The key must match the tool's name.`
        );
      }

      merged.set(name, [tool, options]);
    }
  }

  return [...merged.values()];
}
