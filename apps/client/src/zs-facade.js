export function ensureZS(globalObject = globalThis) {
  globalObject.window = globalObject.window || globalObject;
  globalObject.window.ZS = globalObject.window.ZS || {};
  return globalObject.window.ZS;
}
