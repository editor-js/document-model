import type { ToolConstructable } from '@editorjs/sdk';

/**
 * Merges user-provided tools over the default tools, keyed by name.
 *
 * Defaults are keyed by their static `name`; user tools are keyed by their map
 * key. A user tool whose key matches a default's name replaces that default
 * instead of registering a duplicate (override-by-name).
 * @param defaults - the bundle's default tool constructors
 * @param userTools - tools from `config.tools`, keyed by tool name
 */
export function mergeTools(
  defaults: ToolConstructable[],
  userTools?: Record<string, ToolConstructable>
): ToolConstructable[] {
  const merged = new Map<string, ToolConstructable>();

  for (const tool of defaults) {
    merged.set(tool.name, tool);
  }

  if (userTools !== undefined) {
    for (const [name, tool] of Object.entries(userTools)) {
      merged.set(name, tool);
    }
  }

  return [...merged.values()];
}
