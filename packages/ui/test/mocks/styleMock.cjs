/**
 * Identity proxy for CSS module imports in tests: `Style['foo']` returns 'foo'.
 * `__esModule` and `default` must stay undefined so Jest's ESM-CJS interop
 * exposes the proxy itself as the default export.
 */
module.exports = new Proxy({}, {
  get(_target, prop) {
    if (prop === '__esModule' || prop === 'default' || typeof prop !== 'string') {
      return undefined;
    }

    return prop;
  },
});
