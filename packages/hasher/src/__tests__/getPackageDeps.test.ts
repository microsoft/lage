import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

import { getPackageDeps, parseGitLsTree, parseGitFilename } from "../getPackageDeps";
import { Monorepo } from "@lage-run/monorepo-fixture";

const SOURCE_PATH: string = path.join(__dirname, "..", "__fixtures__");

const TEST_PROJECT_PATH: string = path.join(SOURCE_PATH, "test-project");
const NESTED_TEST_PROJECT_PATH: string = path.join(SOURCE_PATH, "nested-test-project");

const FileSystem = {
  writeFile: fs.writeFileSync,
  deleteFile: fs.rmSync,
};

describe(parseGitFilename.name, () => {
  it("can parse backslash-escaped filenames", () => {
    expect(parseGitFilename("some/path/to/a/file name")).toEqual("some/path/to/a/file name");
    expect(parseGitFilename('"some/path/to/a/file?name"')).toEqual("some/path/to/a/file?name");
    expect(parseGitFilename('"some/path/to/a/file\\\\name"')).toEqual("some/path/to/a/file\\name");
    expect(parseGitFilename('"some/path/to/a/file\\"name"')).toEqual('some/path/to/a/file"name');
    expect(parseGitFilename('"some/path/to/a/file\\"name"')).toEqual('some/path/to/a/file"name');
    expect(parseGitFilename('"some/path/to/a/file\\347\\275\\221\\347\\275\\221name"')).toEqual("some/path/to/a/file网网name");
    expect(parseGitFilename('"some/path/to/a/file\\\\347\\\\\\347\\275\\221name"')).toEqual("some/path/to/a/file\\347\\网name");
    expect(parseGitFilename('"some/path/to/a/file\\\\\\347\\275\\221\\347\\275\\221name"')).toEqual("some/path/to/a/file\\网网name");
  });
});

describe(parseGitLsTree.name, () => {
  it("can handle a blob", () => {
    const filename: string = "src/typings/tsd.d.ts";
    const hash: string = "3451bccdc831cb43d7a70ed8e628dcf9c7f888c8";

    const output: string = `100644 blob ${hash}\t${filename}`;
    const changes: Map<string, string> = parseGitLsTree(output);

    expect(changes.size).toEqual(1); // Expect there to be exactly 1 change
    expect(changes.get(filename)).toEqual(hash); // Expect the hash to be ${hash}
  });

  it("can handle a submodule", () => {
    const filename: string = "rushstack";
    const hash: string = "c5880bf5b0c6c1f2e2c43c95beeb8f0a808e8bac";

    const output: string = `160000 commit ${hash}\t${filename}`;
    const changes: Map<string, string> = parseGitLsTree(output);

    expect(changes.size).toEqual(1); // Expect there to be exactly 1 change
    expect(changes.get(filename)).toEqual(hash); // Expect the hash to be ${hash}
  });

  it("can handle multiple lines", () => {
    const filename1: string = "src/typings/tsd.d.ts";
    const hash1: string = "3451bccdc831cb43d7a70ed8e628dcf9c7f888c8";

    const filename2: string = "src/foo bar/tsd.d.ts";
    const hash2: string = "0123456789abcdef1234567890abcdef01234567";

    const output: string = `100644 blob ${hash1}\t${filename1}\n100666 blob ${hash2}\t${filename2}`;
    const changes: Map<string, string> = parseGitLsTree(output);

    expect(changes.size).toEqual(2); // Expect there to be exactly 2 changes
    expect(changes.get(filename1)).toEqual(hash1); // Expect the hash to be ${hash1}
    expect(changes.get(filename2)).toEqual(hash2); // Expect the hash to be ${hash2}
  });

  it("throws with malformed input", () => {
    expect(parseGitLsTree.bind(undefined, "some super malformed input")).toThrow();
  });
});

describe(getPackageDeps.name, () => {
  it("can parse committed file", async () => {
    const monorepo = new Monorepo("parse-commited-file");
    await monorepo.init(TEST_PROJECT_PATH);

    const results: Map<string, string> = getPackageDeps(monorepo.root);
    const expectedFiles: { [key: string]: string } = {
      "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
      "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
      "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    };
    const filePaths: string[] = Array.from(results.keys()).sort();

    filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
  });

  it("can handle files in subfolders", async () => {
    const monorepo = new Monorepo("files-in-subfolders");
    await monorepo.init(NESTED_TEST_PROJECT_PATH);

    const results: Map<string, string> = getPackageDeps(monorepo.root);
    const expectedFiles: { [key: string]: string } = {
      "src/file 1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    };
    const filePaths: string[] = Array.from(results.keys()).sort();

    filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));

    await monorepo.cleanup();
  });

  it("can handle adding one file", async () => {
    const monorepo = new Monorepo("add-one-file");
    await monorepo.init(TEST_PROJECT_PATH);

    const tempFilePath: string = path.join(monorepo.root, "a.txt");

    FileSystem.writeFile(tempFilePath, "a");

    const results: Map<string, string> = getPackageDeps(monorepo.root);
    try {
      const expectedFiles: { [key: string]: string } = {
        "a.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
        "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
        "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
        "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
        "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
      };
      const filePaths: string[] = Array.from(results.keys()).sort();

      filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
    } finally {
      FileSystem.deleteFile(tempFilePath);
      await monorepo.cleanup();
    }
  });

  it("can handle adding two files", async () => {
    const monorepo = new Monorepo("add-two-files");
    await monorepo.init(TEST_PROJECT_PATH);

    const tempFilePath1: string = path.join(monorepo.root, "a.txt");
    const tempFilePath2: string = path.join(monorepo.root, "b.txt");

    FileSystem.writeFile(tempFilePath1, "a");
    FileSystem.writeFile(tempFilePath2, "a");

    const results: Map<string, string> = getPackageDeps(monorepo.root);
    try {
      const expectedFiles: { [key: string]: string } = {
        "a.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
        "b.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
        "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
        "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
        "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
        "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
      };
      const filePaths: string[] = Array.from(results.keys()).sort();

      filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
    } finally {
      FileSystem.deleteFile(tempFilePath1);
      FileSystem.deleteFile(tempFilePath2);
      await monorepo.cleanup();
    }
  });

  it("can handle removing one file", async () => {
    const monorepo = new Monorepo("remove-one-file");
    await monorepo.init(TEST_PROJECT_PATH);

    const testFilePath: string = path.join(monorepo.root, "file1.txt");

    FileSystem.deleteFile(testFilePath);

    const results: Map<string, string> = getPackageDeps(monorepo.root);
    try {
      const expectedFiles: { [key: string]: string } = {
        "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
        "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
        "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
      };
      const filePaths: string[] = Array.from(results.keys()).sort();

      filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
    } finally {
      execSync(`git checkout ${testFilePath}`, { stdio: "ignore" });
      await monorepo.cleanup();
    }
  });

  it("can handle changing one file", async () => {
    const monorepo = new Monorepo("change-one-file");
    await monorepo.init(TEST_PROJECT_PATH);

    const testFilePath: string = path.join(monorepo.root, "file1.txt");

    FileSystem.writeFile(testFilePath, "abc");

    const results: Map<string, string> = getPackageDeps(monorepo.root);
    try {
      const expectedFiles: { [key: string]: string } = {
        "file1.txt": "f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f",
        "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
        "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
        "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
      };
      const filePaths: string[] = Array.from(results.keys()).sort();

      filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
    } finally {
      execSync(`git checkout ${testFilePath}`, { stdio: "ignore" });
      await monorepo.cleanup();
    }
  });

  it("can exclude a committed file", async () => {
    const monorepo = new Monorepo("exclude-comitted-file");
    await monorepo.init(TEST_PROJECT_PATH);

    const results: Map<string, string> = getPackageDeps(monorepo.root, ["file1.txt", "file  2.txt", "file蝴蝶.txt"]);

    const expectedFiles: { [key: string]: string } = {
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    };
    const filePaths: string[] = Array.from(results.keys()).sort();

    filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
    await monorepo.cleanup();
  });

  it("can exclude an added file", async () => {
    const monorepo = new Monorepo("exclude-added-file");
    await monorepo.init(TEST_PROJECT_PATH);

    const tempFilePath: string = path.join(monorepo.root, "a.txt");

    FileSystem.writeFile(tempFilePath, "a");

    const results: Map<string, string> = getPackageDeps(monorepo.root, ["a.txt"]);
    try {
      const expectedFiles: { [key: string]: string } = {
        "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
        "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
        "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
        "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
      };
      const filePaths: string[] = Array.from(results.keys()).sort();

      expect(filePaths).toHaveLength(Object.keys(expectedFiles).length);

      filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
    } finally {
      FileSystem.deleteFile(tempFilePath);
      await monorepo.cleanup();
    }
  });

  it("can handle a filename with spaces", async () => {
    const monorepo = new Monorepo("filename-with-spaces");
    await monorepo.init(TEST_PROJECT_PATH);

    const tempFilePath: string = path.join(monorepo.root, "a file.txt");

    FileSystem.writeFile(tempFilePath, "a");

    const results: Map<string, string> = getPackageDeps(monorepo.root);
    try {
      const expectedFiles: { [key: string]: string } = {
        "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
        "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
        "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
        "a file.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
        "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
      };
      const filePaths: string[] = Array.from(results.keys()).sort();

      expect(filePaths).toHaveLength(Object.keys(expectedFiles).length);

      filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
    } finally {
      FileSystem.deleteFile(tempFilePath);
      await monorepo.cleanup();
    }
  });

  it("can handle a filename with multiple spaces", async () => {
    const monorepo = new Monorepo("filename-multiple-spaces");
    await monorepo.init(TEST_PROJECT_PATH);

    const tempFilePath: string = path.join(monorepo.root, "a  file name.txt");

    FileSystem.writeFile(tempFilePath, "a");

    const results: Map<string, string> = getPackageDeps(monorepo.root);
    try {
      const expectedFiles: { [key: string]: string } = {
        "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
        "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
        "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
        "a  file name.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
        "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
      };
      const filePaths: string[] = Array.from(results.keys()).sort();

      expect(filePaths).toHaveLength(Object.keys(expectedFiles).length);

      filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
    } finally {
      FileSystem.deleteFile(tempFilePath);
      await monorepo.cleanup();
    }
  });

  it("can handle a filename with non-standard characters", async () => {
    const monorepo = new Monorepo("non-standard-characters");
    await monorepo.init(TEST_PROJECT_PATH);

    const tempFilePath: string = path.join(monorepo.root, "newFile批把.txt");

    FileSystem.writeFile(tempFilePath, "a");

    const results: Map<string, string> = getPackageDeps(monorepo.root);
    try {
      const expectedFiles: { [key: string]: string } = {
        "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
        "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
        "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
        "newFile批把.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
        "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
      };
      const filePaths: string[] = Array.from(results.keys()).sort();

      expect(filePaths).toHaveLength(Object.keys(expectedFiles).length);

      filePaths.forEach((filePath) => expect(results.get(filePath)).toEqual(expectedFiles[filePath]));
    } finally {
      FileSystem.deleteFile(tempFilePath);
      await monorepo.cleanup();
    }
  });
});
