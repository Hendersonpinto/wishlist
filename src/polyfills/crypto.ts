import { randomUUID } from "expo-crypto";

// Polyfill to deal with global crypto whenever it is not available on iOS runtime
if (!("crypto" in globalThis)) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { randomUUID },
  });
}
