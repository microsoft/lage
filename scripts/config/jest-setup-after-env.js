const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();

  for (const key of ["BACKFILL_CACHE_PROVIDER", "BACKFILL_CACHE_PROVIDER_OPTIONS"]) {
    delete process.env[key];
  }
});

afterEach(() => {
  process.env = originalEnv;
});
