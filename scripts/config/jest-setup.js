process.env.FORCE_COLOR = "0";

// Delete any backfill or lage environment variables from local or CI builds.
// (Previously this called jest.resetModules() before and after every test, which causes unwanted
// side effects and slows down tests. If the new approach proves inadequate in the future, any
// refinements should also try to be as targeted as possible and avoid a global resetModules.)
for (const key of Object.keys(process.env)) {
  if (key.startsWith("BACKFILL_") || key.startsWith("LAGE_") || key === "AZURE_IDENTITY_CREDENTIAL_NAME") {
    delete process.env[key];
  }
}
