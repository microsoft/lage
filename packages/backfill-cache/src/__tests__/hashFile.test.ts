import { expect, it } from "@jest/globals";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createTempDir, removeTempDirAsync } from "@lage-run/test-utilities";
import { computeHash, getFileHash } from "../hashFile.js";

it("preserves SHA-1 fingerprints and reads fresh bytes for explicit SHA-256 verification", async () => {
  const root = createTempDir({ prefix: "backfill-hash-" });
  const file = path.join(root, "output.bin");
  const timestamp = new Date("2020-01-01T00:00:00Z");
  const original = Buffer.from([0, 255, 1, 128]);
  const modified = Buffer.from([0, 255, 2, 128]);
  try {
    await fs.writeFile(file, original);
    await fs.utimes(file, timestamp, timestamp);
    expect(await getFileHash(root, "output.bin")).toBe(
      createHash("sha1").update(original).digest("hex")
    );
    const originalHash = await computeHash(file, "sha256");
    expect(originalHash).toBe(
      createHash("sha256").update(original).digest("hex")
    );

    await fs.writeFile(file, modified);
    await fs.utimes(file, timestamp, timestamp);
    expect(await computeHash(file, "sha256")).toBe(
      createHash("sha256").update(modified).digest("hex")
    );
  } finally {
    await removeTempDirAsync(root, { throwOnError: true, maxAttempts: 3 });
  }
});
