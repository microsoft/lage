import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import { Monorepo } from "@lage-run/monorepo-fixture";

import { getRepoState, parseGitLsTree, getRepoRoot } from "../getRepoState";

const SOURCE_PATH = path.resolve(__dirname, "..", "__fixtures__");

const TEST_PROJECT_PATH = path.resolve(SOURCE_PATH, "test-project");

const FileSystem = {
  writeFile: fs.writeFileSync,
  deleteFile: fs.rmSync,
};

describe(getRepoRoot.name, () => {
  it(`returns the correct directory`, () => {
    const root: string = getRepoRoot(__dirname);
    const expectedRoot: string = path.resolve(__dirname, "../../../..").replace(/\\/g, "/");
    expect(root).toEqual(expectedRoot);
  });
});

describe(parseGitLsTree.name, () => {
  it("can handle a blob", () => {
    const filename: string = "src/typings/tsd.d.ts";
    const hash: string = "3451bccdc831cb43d7a70ed8e628dcf9c7f888c8";

    const output: string = `100644 blob ${hash}\t${filename}\x00`;
    const changes: Map<string, string> = parseGitLsTree(output);

    expect(changes.size).toEqual(1); // Expect there to be exactly 1 change
    expect(changes.get(filename)).toEqual(hash); // Expect the hash to be ${hash}
  });

  it("can handle a submodule", () => {
    const filename: string = "rushstack";
    const hash: string = "c5880bf5b0c6c1f2e2c43c95beeb8f0a808e8bac";

    const output: string = `160000 commit ${hash}\t${filename}\x00`;
    const changes: Map<string, string> = parseGitLsTree(output);

    expect(changes.size).toEqual(1); // Expect there to be exactly 1 change
    expect(changes.get(filename)).toEqual(hash); // Expect the hash to be ${hash}
  });

  it("can handle multiple lines", () => {
    const filename1: string = "src/typings/tsd.d.ts";
    const hash1: string = "3451bccdc831cb43d7a70ed8e628dcf9c7f888c8";

    const filename2: string = "src/foo bar/tsd.d.ts";
    const hash2: string = "0123456789abcdef1234567890abcdef01234567";

    const output: string = `100644 blob ${hash1}\t${filename1}\x00100666 blob ${hash2}\t${filename2}\0`;
    const changes: Map<string, string> = parseGitLsTree(output);

    expect(changes.size).toEqual(2); // Expect there to be exactly 2 changes
    expect(changes.get(filename1)).toEqual(hash1); // Expect the hash to be ${hash1}
    expect(changes.get(filename2)).toEqual(hash2); // Expect the hash to be ${hash2}
  });
});

describe(getRepoState.name, () => {
  it("can parse committed files", async () => {
    const monorepo = new Monorepo("comitted-files");
    await monorepo.init(TEST_PROJECT_PATH);

    const results: Map<string, string> = getRepoState(monorepo.root);

    const expectedFiles: Map<string, string> = new Map(
      Object.entries({
        "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
        "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
        "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
        "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
      })
    );

    for (const [filePath, hash] of expectedFiles) {
      expect(results.get(filePath)).toEqual(hash);
    }
    expect(results.size).toEqual(expectedFiles.size);

    await monorepo.cleanup();
  });

  it("can handle adding one file", async () => {
    const monorepo = new Monorepo("add-one-file");
    await monorepo.init(TEST_PROJECT_PATH);

    const tempFilePath: string = path.join(monorepo.root, "a.txt");

    FileSystem.writeFile(tempFilePath, "a");

    const results: Map<string, string> = getRepoState(monorepo.root);

    try {
      const expectedFiles: Map<string, string> = new Map(
        Object.entries({
          "a.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
          "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
          "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
          "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
          "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
        })
      );

      for (const [filePath, hash] of expectedFiles) {
        expect(results.get(filePath)).toEqual(hash);
      }
      expect(results.size).toEqual(expectedFiles.size);
    } finally {
      await monorepo.cleanup();
    }
  });

  it("can handle adding two files", async () => {
    const monorepo = new Monorepo("add-two-file");
    await monorepo.init(TEST_PROJECT_PATH);

    const tempFilePath1: string = path.join(monorepo.root, "a.txt");
    const tempFilePath2: string = path.join(monorepo.root, "b.txt");

    FileSystem.writeFile(tempFilePath1, "a");
    FileSystem.writeFile(tempFilePath2, "a");

    const results: Map<string, string> = getRepoState(monorepo.root);

    try {
      const expectedFiles: Map<string, string> = new Map(
        Object.entries({
          "a.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
          "b.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
          "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
          "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
          "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
          "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
        })
      );

      for (const [filePath, hash] of expectedFiles) {
        expect(results.get(filePath)).toEqual(hash);
      }
      expect(results.size).toEqual(expectedFiles.size);
    } finally {
      await monorepo.cleanup();
    }
  });

  it("can handle removing one file", async () => {
    const monorepo = new Monorepo("remove-one-file");
    await monorepo.init(TEST_PROJECT_PATH);
    const testFilePath: string = path.join(monorepo.root, "file1.txt");

    FileSystem.deleteFile(testFilePath);

    const results: Map<string, string> = getRepoState(monorepo.root);

    try {
      const expectedFiles: Map<string, string> = new Map(
        Object.entries({
          "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
          "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
          "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
        })
      );

      for (const [filePath, hash] of expectedFiles) {
        expect(results.get(filePath)).toEqual(hash);
      }
      expect(results.size).toEqual(expectedFiles.size);
    } finally {
      await monorepo.cleanup();
    }
  });

  it("can handle changing one file", async () => {
    const monorepo = new Monorepo("change-one-file");
    await monorepo.init(TEST_PROJECT_PATH);

    const testFilePath: string = path.join(monorepo.root, "file1.txt");

    FileSystem.writeFile(testFilePath, "abc");

    const results: Map<string, string> = getRepoState(monorepo.root);

    try {
      const expectedFiles: Map<string, string> = new Map(
        Object.entries({
          "file1.txt": "f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f",
          "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
          "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
          "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
        })
      );

      for (const [filePath, hash] of expectedFiles) {
        expect(results.get(filePath)).toEqual(hash);
      }
      expect(results.size).toEqual(expectedFiles.size);
    } finally {
      await monorepo.cleanup();
    }
  });

  it("can handle uncommitted filenames with spaces and non-ASCII characters", async () => {
    const monorepo = new Monorepo("uncommitted-filenames-with-spaces-and-non-ascii-characters");
    await monorepo.init(TEST_PROJECT_PATH);

    const tempFilePath1: string = path.join(monorepo.root, "a file.txt");
    const tempFilePath2: string = path.join(monorepo.root, "a  file name.txt");
    const tempFilePath3: string = path.join(monorepo.root, "newFile批把.txt");

    FileSystem.writeFile(tempFilePath1, "a");
    FileSystem.writeFile(tempFilePath2, "a");
    FileSystem.writeFile(tempFilePath3, "a");

    const results: Map<string, string> = getRepoState(monorepo.root);

    try {
      const expectedFiles: Map<string, string> = new Map(
        Object.entries({
          "a file.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
          "a  file name.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
          "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
          "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
          "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
          "newFile批把.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
          "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
        })
      );

      for (const [filePath, hash] of expectedFiles) {
        expect(results.get(filePath)).toEqual(hash);
      }
      expect(results.size).toEqual(expectedFiles.size);
    } finally {
      await monorepo.cleanup();
    }
  });
});
