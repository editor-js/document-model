// @ts-check

/**
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Context} Context
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Dependency} Dependency
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Workspace} Workspace
 */

/** @type {Record<string, string[]>} */
const ALLOWED_CONSUMERS = {
  '@editorjs/model-types': ['@editorjs/model', '@editorjs/sdk'],
  '@editorjs/model': ['@editorjs/core', '@editorjs/ot-server', '@editorjs/document-playground'],
};

/**
 * @param {Context} ctx
 */
function enforceDependencyConstraints({ Yarn }) {
  for (const workspace of Yarn.workspaces()) {
    for (const dep of Yarn.dependencies({ workspace })) {
      if (dep.type !== 'dependencies') {
        continue;
      }

      const allowed = ALLOWED_CONSUMERS[dep.ident];

      if (!allowed) {
        continue;
      }

      if (!allowed.includes(workspace.ident)) {
        dep.error(
          `Package "${workspace.ident}" must not depend on "${dep.ident}". ` +
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
