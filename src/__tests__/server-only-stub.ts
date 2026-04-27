// Vitest shim for Next's `server-only` package, which has no runtime
// API and exists only as a build-time guard against importing
// server-only modules from client code. Aliased in vitest.config.ts.
export {};
