import { simulateFileAccess } from "../src/commands/exec/simulateFileAccess";
import fs from "fs";
import path from "path";
import os from "os";

jest.mock("fs");

// Mock the logger
const mockSilly = jest.fn();
const mockLogger = {
  silly: mockSilly,
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn(),
  debug: jest.fn(),
};

describe("simulateFileAccess", () => {
  let mockRoot: string;
  let mockOpenSync: jest.SpyInstance;
  let mockCloseSync: jest.SpyInstance;
  let mockUtimesSync: jest.SpyInstance;

  beforeEach(() => {
    mockRoot = path.join(os.tmpdir(), "lage-test-root");

    mockOpenSync = jest.spyOn(fs, "openSync").mockReturnValue(123);
    mockCloseSync = jest.spyOn(fs, "closeSync").mockImplementation(() => {});
    mockUtimesSync = jest.spyOn(fs, "utimesSync").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("should probe files and their parent directories for inputs", async () => {
    // Nested directory structure with a file at the deepest level
    const inputs = ["packages/a/src/components/Button.tsx", "packages/b/dist/index.js"];
    const outputs: string[] = [];

    await simulateFileAccess(mockLogger, mockRoot, inputs, outputs);

    // Verify the files were probed
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "packages/a/src/components/Button.tsx"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "packages/b/dist/index.js"), "r");

    // Verify all parent directories were probed
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "packages/a/src/components"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "packages/a/src"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "packages/a"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "packages"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "packages/b/dist"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "packages/b"), "r");

    // Verify close was called the same number of times as open
    expect(mockCloseSync).toHaveBeenCalledTimes(mockOpenSync.mock.calls.length);
  });

  test("should handle deeply nested directories", async () => {
    // Very deep nesting with a single file at the deepest level
    const inputs = ["level1/level2/level3/level4/level5/file.txt"];
    const outputs: string[] = [];

    await simulateFileAccess(mockLogger, mockRoot, inputs, outputs);

    // Verify the file was probed
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "level1/level2/level3/level4/level5/file.txt"), "r");

    // Verify all parent directories were probed
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "level1/level2/level3/level4/level5"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "level1/level2/level3/level4"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "level1/level2/level3"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "level1/level2"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "level1"), "r");
  });

  test("should update timestamps for output files and their directories", async () => {
    const inputs: string[] = [];
    const outputs = ["dist/bundles/main.js", "dist/types/index.d.ts"];

    await simulateFileAccess(mockLogger, mockRoot, inputs, outputs);

    // Verify timestamps were updated for output files
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist/bundles/main.js"), expect.any(Date), expect.any(Date));
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist/types/index.d.ts"), expect.any(Date), expect.any(Date));

    // Verify timestamps were updated for all parent directories
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist/bundles"), expect.any(Date), expect.any(Date));
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist/types"), expect.any(Date), expect.any(Date));
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist"), expect.any(Date), expect.any(Date));
  });

  test("should handle mixed inputs and outputs with overlapping directories", async () => {
    const inputs = ["src/components/Button.tsx", "src/utils/helpers.ts"];
    const outputs = ["dist/components/Button.js", "dist/utils/helpers.js"];

    await simulateFileAccess(mockLogger, mockRoot, inputs, outputs);

    // Verify both input and output files were handled correctly
    // Input files should be opened and closed
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "src/components/Button.tsx"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "src/utils/helpers.ts"), "r");

    // Input directories should be opened and closed
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "src/components"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "src/utils"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "src"), "r");

    // Output files should have timestamps updated
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist/components/Button.js"), expect.any(Date), expect.any(Date));
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist/utils/helpers.js"), expect.any(Date), expect.any(Date));

    // Output directories should have timestamps updated
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist/components"), expect.any(Date), expect.any(Date));
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist/utils"), expect.any(Date), expect.any(Date));
    expect(mockUtimesSync).toHaveBeenCalledWith(path.join(mockRoot, "dist"), expect.any(Date), expect.any(Date));
  });

  test("should handle errors during file operations", async () => {
    // Restore original mocks to allow error simulation
    mockOpenSync.mockRestore();

    // Set up a mock that fails for a specific file path
    const failingPath = path.join(mockRoot, "src/components/Missing.tsx");
    jest.spyOn(fs, "openSync").mockImplementation((filePath, mode) => {
      if (filePath === failingPath) {
        throw new Error("ENOENT: File not found");
      }
      return 123;
    });

    const inputs = [
      "src/components/Button.tsx",
      "src/components/Missing.tsx", // This file will cause an error
    ];
    const outputs: string[] = [];

    // Function should not throw even when file operations fail
    await expect(simulateFileAccess(mockLogger, mockRoot, inputs, outputs)).resolves.not.toThrow();

    // Verify that other operations still proceed despite errors
    expect(fs.openSync).toHaveBeenCalledWith(path.join(mockRoot, "src/components/Button.tsx"), "r");
    expect(fs.openSync).toHaveBeenCalledWith(failingPath, "r");
  });

  test("should handle empty directories with only a single file", async () => {
    // Create a test case where the input list contains only directories and a single file
    const inputs = ["empty-dir-1/", "empty-dir-2/", "empty-dir-3/single-file.txt"];
    const outputs: string[] = [];

    await simulateFileAccess(mockLogger, mockRoot, inputs, outputs);

    // Verify all directories were probed
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "empty-dir-1/"), "r");
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "empty-dir-2/"), "r");

    // Verify the file was probed
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "empty-dir-3/single-file.txt"), "r");

    // Verify parent directory was also probed
    expect(mockOpenSync).toHaveBeenCalledWith(path.join(mockRoot, "empty-dir-3"), "r");
  });
});
