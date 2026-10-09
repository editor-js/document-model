/**
 * Stands in for a CSS Modules import under Jest, which cannot parse `.pcss`: every property read
 * returns its own name, so an assertion on rendered markup names the class the source asked for.
 * `__esModule` is answered explicitly, since left to the proxy it would return a truthy string
 * and the ESM interop would look for a `default` export that does not exist
 */
module.exports = new Proxy({}, {
  get: (_target, key) => (key === '__esModule' ? false : key),
});
