// Runs against packed packages without development dependencies.
const assert = require("assert").strict;
const { createHash } = require("crypto");
const fs = require("fs");
const { createRequire } = require("module");
const path = require("path");

const root = path.resolve(process.argv[2]);
const requireFromInstall = createRequire(path.join(root, "package.json"));
/** @type {typeof import("../packages/glob-hasher/index.js")} */
const binding = requireFromInstall("glob-hasher");
const wrapper = path.dirname(requireFromInstall.resolve("glob-hasher/package.json"));
assert(!fs.readdirSync(wrapper).some((file) => file.endsWith(".node")), "Wrapper must load the optional platform package");
const fixture = path.join(root, "fixtures");
fs.mkdirSync(fixture, { recursive: true });
const bytes = Buffer.from("native package smoke test\n");
fs.writeFileSync(path.join(fixture, "file.txt"), bytes);
const expectedHash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
assert.deepEqual(binding.hash(["file.txt", "missing.txt"], { cwd: fixture }), { "file.txt": expectedHash, "missing.txt": null });
assert.deepEqual(binding.hashGlobGit(["*.txt"], { cwd: fixture }), { "file.txt": expectedHash });
const xxhash = binding.hashGlobXxhash(["*.txt"], { cwd: fixture });
const files = binding.glob(["*.txt"], { cwd: fixture });
const stats = binding.stat(["file.txt"], { cwd: fixture });
assert(xxhash && files && stats, "Native APIs must return results");
assert.equal(typeof xxhash["file.txt"], "bigint");
assert.deepEqual(
  files.map((file) => path.basename(file)),
  ["file.txt"]
);
assert.equal(stats["file.txt"].size, bytes.length);
assert.equal(typeof stats["file.txt"].mtime, "bigint");
console.log(`Packed native binding passed on ${process.platform}-${process.arch}, Node ${process.version}`);
