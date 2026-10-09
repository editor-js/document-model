/**
 * Stands in for a CSS Modules import under Jest, which cannot parse `.pcss`.
 *
 * Every property read returns the property's own name, so `Style['ce-toolbar']`
 * is the string `'ce-toolbar'` and assertions on rendered markup name the class
 * the source actually asked for. `__esModule` is answered explicitly: left to the
 * proxy it would return a truthy string, and the ESM interop would then look for
 * a `default` export that does not exist.
 */
module.exports = new Proxy({}, {
  get: (_target, key) => (key === '__esModule' ? false : key),
});
