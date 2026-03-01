/**
 * Preload script — runs before any application modules are imported.
 * Suppresses the bigint-buffer native-binding warning that fires when
 * the C++ addon can't be loaded (pure-JS fallback works fine on modern Node).
 */
const _origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('bigint: Failed to load bindings')) return;
  _origWarn.apply(console, args);
};
