import { describe, expect, it } from "@jest/globals";
import path from "path";
import fs from "fs-extra";

import { setupFixture } from "@lage-run/test-utilities";
import { makeLogger } from "backfill-logger";

import { createBuildCommand } from "../commandRunner.js";

const muteLogger = makeLogger("mute");

describe("createBuildCommand", () => {
  it("runs a command successfully", async () => {
    const buildCommand = createBuildCommand(
      ["echo foo"],
      false,
      [""],
      muteLogger
    );

    const buildResult = await buildCommand();

    if (buildResult) {
      expect(buildResult.stdout).toEqual("foo");
    }
  });

  it("resolves if no command can be found", async () => {
    const buildCommand = createBuildCommand([""], false, [""], muteLogger);

    await expect(buildCommand()).rejects.toThrow("Command not provided");
  });

  it("prints the error command and throws if it fails", async () => {
    const stderr: string[] = [];
    const stdout: string[] = [];
    const mockConsole = {
      info(...args: string[]): void {
        args.forEach((a) => stdout.push(a));
      },

      warn(...args: string[]): void {
        args.forEach((a) => stderr.push(a));
      },
      error(...args: string[]): void {
        args.forEach((a) => stderr.push(a));
      },
    };

    const logger = makeLogger("error", { console: mockConsole });
    const buildCommand = createBuildCommand(
      ["somecommand"],
      false,
      [""],
      logger
    )();

    try {
      await buildCommand;
    } catch {
      /* comment to prevent eslint from complaining */
    }

    await expect(buildCommand).rejects.toThrow();
    expect(stderr.filter((m) => m.includes("somecommand")).length).not.toBe(0);
  });

  it("clears the output folder", async () => {
    const fixtureLocation = setupFixture("pre-built");
    const buildCommand = createBuildCommand(
      ["echo foo"],
      true,
      [path.join(fixtureLocation, "lib/**").replace(/\\/g, "/")],
      muteLogger
    );

    const index_js_ExistsBeforeBuild = fs.existsSync(
      path.join(fixtureLocation, "lib", "index.js")
    );
    await buildCommand();
    const index_js_ExistsAfterBuild = fs.existsSync(
      path.join(fixtureLocation, "lib", "index.js")
    );

    expect(index_js_ExistsBeforeBuild).toEqual(true);
    expect(index_js_ExistsAfterBuild).toEqual(false);
  });
});
