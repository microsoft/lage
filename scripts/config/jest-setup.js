process.env.FORCE_COLOR = "0";

for (const key of Object.keys(process.env)) {
  // Delete any backfill or lage environment variables from local or CI builds.
  if (key.startsWith("BACKFILL_") || key.startsWith("LAGE_")) {
    delete process.env[key];
  }
}
