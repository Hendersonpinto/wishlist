
## Crypto UUID compatibility

The API creates item IDs with `crypto.randomUUID()`. Some React Native runtimes like the iOS simulator, does not provide the Node core `crypto`. To keep the API unchanged, I added a polyfill at `src/polyfills/crypto.ts` that redefines a new `globalThis.crypto` wheenever the global is missing.
