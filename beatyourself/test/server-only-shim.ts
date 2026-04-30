// No-op replacement for the `server-only` package during test runs. The real package
// throws when imported into a client bundle; under vitest (Node) we just need it to
// load silently so server-only modules can be unit-tested.
export {};
