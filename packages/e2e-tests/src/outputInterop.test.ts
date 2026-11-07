import { describe, expect, it } from "@jest/globals";
import { sync as execaSync } from "execa";
import fs from "fs";
import path from "path";

const packageRoot = path.resolve(__dirname, "../..");

describe("output interop", () => {
  // The swc option exportInteropAnnotation is necessary to produce CJS output that's compatible
  // with Node's ESM loader (contains some syntax it understands for the export names)
  it("can import CJS output from ESM in Node", () => {
    // Run this file in Node natively (don't want jest transforms interfering)
    const filePath = path.resolve(__dirname, "./mock/testImport.mjs");
    expect(fs.existsSync(filePath)).toBe(true);

    const result = execaSync("node", [filePath], { cwd: __dirname, stdio: "pipe" });
    expect(result.failed).toBe(false);
    expect(result.stdout).toContain(`package root ${packageRoot}`);
  });

  // Don't know why this would fail, but it's a quick test
  it("can require CJS output from CJS in Node", () => {
    const filePath = path.resolve(__dirname, "./mock/testRequire.cjs");
    expect(fs.existsSync(filePath)).toBe(true);

    const result = execaSync("node", [filePath], { cwd: __dirname, stdio: "pipe" });
    expect(result.failed).toBe(false);
    expect(result.stdout).toContain(`package root ${packageRoot}`);
  });
});
