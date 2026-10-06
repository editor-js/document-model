// Lifecycle tests need stable CSS class names, not the generated stylesheet.
module.exports = new Proxy({}, {
  get: (_target, property) => property,
});
