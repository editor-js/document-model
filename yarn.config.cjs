// @ts-check

/**
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Context} Context
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Dependency} Dependency
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Workspace} Workspace
 */

/**
 * Per restricted package: which workspaces may depend on it via `dependencies` and
 * via `devDependencies`. A `null` list means that dependency type is unrestricted
 * (e.g. any workspace may depend on `@editorjs/model` for testing purposes).
 * @type {Record<string, { dependencies: string[], devDependencies: string[] | null }>}
 */
const ALLOWED_CONSUMERS = {
  '@editorjs/model-types': {
    dependencies: ['@editorjs/model', '@editorjs/sdk'],
    devDependencies: ['@editorjs/model', '@editorjs/sdk'],
  },
  '@editorjs/model': {
    dependencies: ['@editorjs/core', '@editorjs/ot-server', '@editorjs/document-playground'],
    devDependencies: null,
  },
};

const CHECKED_DEPENDENCY_TYPES = ['dependencies', 'devDependencies'];

/**
 * @param {Context} ctx
 */
function enforceDependencyConstraints({ Yarn }) {
  for (const workspace of Yarn.workspaces()) {
    for (const dep of Yarn.dependencies({ workspace })) {
      if (!CHECKED_DEPENDENCY_TYPES.includes(dep.type)) {
        continue;
      }

      const rule = ALLOWED_CONSUMERS[dep.ident];

      if (!rule) {
        continue;
      }

      const allowed = rule[dep.type];

      if (allowed === null) {
        continue;
      }

      if (!allowed.includes(workspace.ident)) {
        dep.error(
          `Package "${workspace.ident}" must not depend on "${dep.ident}" via ${dep.type}. ` +
          `Only ${allowed.map(a => `"${a}"`).join(', ')} may depend on it.`,
        );
      }
    }
  }
}

module.exports = {
  async constraints(ctx) {
    enforceDependencyConstraints(ctx);
  },
};
