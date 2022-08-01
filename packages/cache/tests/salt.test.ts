import mockFs from "mock-fs";
import { salt, _testResetEnvHash } from "../src/salt";

describe("salt", () => {
  beforeEach(() => {
    _testResetEnvHash();
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should generate the same salt for the same files each time even with env-hash cache reset", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    mockFs(contents);
    const contentsSalt = await salt(["test.txt"], "command", process.cwd());
    mockFs.restore();

    _testResetEnvHash();

    mockFs(contents);
    const newContentsSalt = await salt(["test.txt"], "command", process.cwd());
    mockFs.restore();

    expect(contentsSalt).toBe(newContentsSalt);
  });

  it("should generate different salt for updated content of environment files", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    mockFs(contents);
    const contentsSalt = await salt(["test.txt"], "command", process.cwd());
    mockFs.restore();

    _testResetEnvHash();

    mockFs({
      ...contents,
      "test.txt": "test text 2",
    });
    const contentsSaltChanged = await salt(["test.txt"], "command", process.cwd());
    mockFs.restore();

    expect(contentsSalt).not.toBe(contentsSaltChanged);
  });

  it("should generate different salt for different commands", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    mockFs(contents);
    const contentsSalt = await salt(["test.txt"], "command", process.cwd());
    mockFs.restore();

    _testResetEnvHash();

    mockFs(contents);
    const newSalt = await salt(["test.txt"], "command2", process.cwd());
    mockFs.restore();

    expect(contentsSalt).not.toBe(newSalt);
  });

  it("should generate different salt for different customKeys", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    mockFs(contents);
    const contentsSalt = await salt(["test.txt"], "command", process.cwd(), "custom1");
    mockFs.restore();

    _testResetEnvHash();

    mockFs(contents);
    const newSalt = await salt(["test.txt"], "command", process.cwd(), "custom2");
    mockFs.restore();

    expect(contentsSalt).not.toBe(newSalt);
  });

  it("should return a salt for no environment files", async () => {
    const contents = {
      "lage.config.js": 'module.exports = { environmentGlob: ["test.txt"] }',
      "test.txt": "test text",
    };

    mockFs(contents);
    const contentsSalt = await salt([], "command", process.cwd());
    mockFs.restore();

    expect(contentsSalt).not.toBeUndefined();
  });
});
