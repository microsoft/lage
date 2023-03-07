import fs from "fs";
import os from "os";
import path from "path";

import { salt, _testResetEnvHash } from "../src/salt";

function mockFs(contents: Record<string, string>) {
  const tmpDir = fs.mkdtempSync(os.tmpdir() + path.sep);
  for (const [filename, content] of Object.entries(contents)) {
    fs.writeFileSync(path.join(tmpDir, filename), content);
  }

  return { cwd: tmpDir, cleanup: () => fs.rmdirSync(tmpDir, { recursive: true }) };
}

describe("salt", () => {
  beforeEach(() => {
    _testResetEnvHash();
  });

  it("should generate the same salt for the same files each time even with env-hash cache reset", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    const dir = mockFs(contents);
    const contentsSalt = await salt(["test.txt"], "command", dir.cwd);
    dir.cleanup();

    _testResetEnvHash();

    const dir2 = mockFs(contents);
    const newContentsSalt = await salt(["test.txt"], "command", dir2.cwd);
    dir2.cleanup();

    expect(contentsSalt).toBe(newContentsSalt);
  });

  it("should generate different salt for updated content of environment files", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    const dir = mockFs(contents);
    const contentsSalt = await salt(["test.txt"], "command", dir.cwd);
    dir.cleanup();

    _testResetEnvHash();

    const dir2 = mockFs({
      ...contents,
      "test.txt": "test text 2",
    });

    const contentsSaltChanged = await salt(["test.txt"], "command", dir2.cwd);
    dir2.cleanup();

    expect(contentsSalt).not.toBe(contentsSaltChanged);
  });

  it("should generate different salt for different commands", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    const dir = mockFs(contents);
    const contentsSalt = await salt(["test.txt"], "command", dir.cwd);
    dir.cleanup();

    _testResetEnvHash();

    const dir2 = mockFs(contents);
    const newSalt = await salt(["test.txt"], "command2", dir2.cwd);
    dir2.cleanup();

    expect(contentsSalt).not.toBe(newSalt);
  });

  it("should generate different salt for different customKeys", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    const dir = mockFs(contents);
    const contentsSalt = await salt(["test.txt"], "command", dir.cwd, "custom1");
    dir.cleanup();

    _testResetEnvHash();

    const dir2 = mockFs(contents);
    const newSalt = await salt(["test.txt"], "command", dir2.cwd, "custom2");
    dir2.cleanup();

    expect(contentsSalt).not.toBe(newSalt);
  });

  it("should return a salt for no environment files", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    const dir = mockFs(contents);
    const contentsSalt = await salt([], "command", dir.cwd);
    dir.cleanup();

    expect(contentsSalt).not.toBeUndefined();
  });
});
