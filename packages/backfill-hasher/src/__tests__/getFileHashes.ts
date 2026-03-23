import fs from "fs";
import path from "path";
import { removeTempDir, setupFixture } from "@lage-run/test-utilities";
import {
  getFileHashes,
  _parseGitFilename,
  _parseGitLsTree,
} from "../getFileHashes.js";

describe(_parseGitFilename.name, () => {
  it("can parse backslash-escaped filenames", () => {
    expect(_parseGitFilename("some/path/to/a/file name")).toEqual(
      "some/path/to/a/file name"
    );
    expect(_parseGitFilename('"some/path/to/a/file?name"')).toEqual(
      "some/path/to/a/file?name"
    );
    expect(_parseGitFilename('"some/path/to/a/file\\\\name"')).toEqual(
      "some/path/to/a/file\\name"
    );
    expect(_parseGitFilename('"some/path/to/a/file\\"name"')).toEqual(
      'some/path/to/a/file"name'
    );
    expect(_parseGitFilename('"some/path/to/a/file\\"name"')).toEqual(
      'some/path/to/a/file"name'
    );
    expect(
      _parseGitFilename(
        '"some/path/to/a/file\\347\\275\\221\\347\\275\\221name"'
      )
    ).toEqual("some/path/to/a/file网网name");
    expect(
      _parseGitFilename('"some/path/to/a/file\\\\347\\\\\\347\\275\\221name"')
    ).toEqual("some/path/to/a/file\\347\\网name");
    expect(
      _parseGitFilename(
        '"some/path/to/a/file\\\\\\347\\275\\221\\347\\275\\221name"'
      )
    ).toEqual("some/path/to/a/file\\网网name");
  });
});

describe(_parseGitLsTree.name, () => {
  it("can handle a blob", () => {
    const filename = "src/typings/tsd.d.ts";
    const hash = "3451bccdc831cb43d7a70ed8e628dcf9c7f888c8";

    const output = `100644 blob ${hash}\t${filename}`;
    const changes = _parseGitLsTree(output);

    expect(changes).toEqual({ [filename]: hash });
  });

  it("can handle a submodule", () => {
    const filename = "rushstack";
    const hash = "c5880bf5b0c6c1f2e2c43c95beeb8f0a808e8bac";

    const output = `160000 commit ${hash}\t${filename}`;
    const changes = _parseGitLsTree(output);

    expect(changes).toEqual({ [filename]: hash });
  });

  it("can handle multiple lines", () => {
    const filename1 = "src/typings/tsd.d.ts";
    const hash1 = "3451bccdc831cb43d7a70ed8e628dcf9c7f888c8";

    const filename2 = "src/foo bar/tsd.d.ts";
    const hash2 = "0123456789abcdef1234567890abcdef01234567";

    const output = `100644 blob ${hash1}\t${filename1}\n100666 blob ${hash2}\t${filename2}`;
    const changes = _parseGitLsTree(output);

    expect(changes).toEqual({ [filename1]: hash1, [filename2]: hash2 });
  });

  it("throws with malformed input", () => {
    expect(
      _parseGitLsTree.bind(undefined, "some super malformed input")
    ).toThrow();
  });
});

describe(getFileHashes.name, () => {
  let root = "";

  afterEach(() => {
    root && removeTempDir(root);
    root = "";
  });

  it("can parse committed file", () => {
    root = setupFixture("hasher-test-project");

    const results = getFileHashes(root);
    expect(results).toEqual({
      "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
      "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
      "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    });
  });

  it("can handle files in subfolders", () => {
    root = setupFixture("hasher-nested-test-project");

    const results = getFileHashes(root);
    expect(results).toEqual({
      // This should use a forward slash
      "src/file 1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    });
  });

  it("can handle adding one file", () => {
    root = setupFixture("hasher-test-project");

    const tempFilePath = path.join(root, "a.txt");

    fs.writeFileSync(tempFilePath, "a");

    const results = getFileHashes(root);
    expect(results).toEqual({
      "a.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
      "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
      "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
      "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    });
  });

  it("can handle adding two files", () => {
    root = setupFixture("hasher-test-project");

    const tempFilePath1 = path.join(root, "a.txt");
    const tempFilePath2 = path.join(root, "b.txt");

    fs.writeFileSync(tempFilePath1, "a");
    fs.writeFileSync(tempFilePath2, "a");

    const results = getFileHashes(root);
    expect(results).toEqual({
      "a.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
      "b.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
      "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
      "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
      "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    });
  });

  it("can handle removing one file", () => {
    root = setupFixture("hasher-test-project");

    const testFilePath = path.join(root, "file1.txt");

    fs.rmSync(testFilePath);

    const results = getFileHashes(root);
    expect(results).toEqual({
      "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
      "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    });
  });

  it("can handle changing one file", () => {
    root = setupFixture("hasher-test-project");

    const testFilePath = path.join(root, "file1.txt");

    fs.writeFileSync(testFilePath, "abc");

    const results = getFileHashes(root);
    expect(results).toEqual({
      "file1.txt": "f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f",
      "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
      "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    });
  });

  it("can handle a filename with spaces", () => {
    root = setupFixture("hasher-test-project");

    const tempFilePath = path.join(root, "a file.txt");

    fs.writeFileSync(tempFilePath, "a");

    const results = getFileHashes(root);
    expect(results).toEqual({
      "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
      "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
      "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
      "a file.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    });
  });

  it("can handle a filename with multiple spaces", () => {
    root = setupFixture("hasher-test-project");

    const tempFilePath = path.join(root, "a  file name.txt");

    fs.writeFileSync(tempFilePath, "a");

    const results = getFileHashes(root);
    expect(results).toEqual({
      "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
      "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
      "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
      "a  file name.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    });
  });

  it("can handle a filename with non-standard characters", () => {
    root = setupFixture("hasher-test-project");

    const tempFilePath = path.join(root, "newFile批把.txt");

    fs.writeFileSync(tempFilePath, "a");

    const results = getFileHashes(root);
    expect(results).toEqual({
      "file1.txt": "c7b2f707ac99ca522f965210a7b6b0b109863f34",
      "file  2.txt": "a385f754ec4fede884a4864d090064d9aeef8ccb",
      "file蝴蝶.txt": "ae814af81e16cb2ae8c57503c77e2cab6b5462ba",
      "newFile批把.txt": "2e65efe2a145dda7ee51d1741299f848e5bf752e",
      "package.json": "18a1e415e56220fa5122428a4ef8eb8874756576",
    });
  });
});
