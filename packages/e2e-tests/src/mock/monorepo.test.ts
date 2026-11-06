import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import path from "path";
import type execa from "execa";
import type * as workspaceTools from "workspace-tools";
import type * as monorepo from "./monorepo.js";

jest.mock("execa", () => {
  const sync = jest.fn();
  return { __esModule: true, default: Object.assign(jest.fn(), { sync }), sync };
});

jest.mock("workspace-tools", () => ({
  ...jest.requireActual<typeof workspaceTools>("workspace-tools"),
  findGitRoot: jest.fn(() => path.resolve("mock-lage-repo")),
}));

const { Monorepo } = jest.requireActual<typeof monorepo>("./monorepo.js");
const { default: mockExeca } = jest.requireMock<{ default: jest.Mock<typeof execa> }>("execa");

describe("Monorepo", () => {
  let repo: monorepo.Monorepo;

  beforeEach(() => {
    repo = new Monorepo("monorepo-unit");
  });

  afterEach(async () => {
    await repo.cleanup();
  });

  describe("runLage", () => {
    function setScripts(scripts: Record<string, string>) {
      repo.writeFiles({
        "package.json": { name: "monorepo-unit", version: "0.1.0", scripts },
      });
    }

    it.each([
      { name: "a bare Lage command", script: "lage", args: [], expectedArgs: [] },
      {
        name: "root script flags",
        script: "lage test --reporter json --log-level silly",
        args: [],
        expectedArgs: ["test", "--reporter", "json", "--log-level", "silly"],
      },
      {
        name: "additional arguments containing spaces",
        script: "lage test --reporter json",
        args: ["--scope", "package with spaces"],
        expectedArgs: ["test", "--reporter", "json", "--scope", "package with spaces"],
      },
      {
        name: "extra script whitespace",
        script: "  lage   test --reporter json  ",
        args: [],
        expectedArgs: ["test", "--reporter", "json"],
      },
      { name: "a script alias", script: "lage cache --clear", args: [], expectedArgs: ["cache", "--clear"] },
    ])("runs $name directly through Node", async ({ script, args, expectedArgs }) => {
      setScripts({ test: script });

      await repo.runLage("test", args);

      expect(mockExeca).toHaveBeenCalledTimes(1);
      expect(mockExeca).toHaveBeenCalledWith(process.execPath, [path.join(repo.root, "node_modules/lage/dist/lage.js"), ...expectedArgs], {
        cwd: repo.root,
        shell: false,
      });
    });

    it("forwards process options without enabling a shell", async () => {
      setScripts({ test: "lage test" });

      await repo.runLage("test", [], { env: { CUSTOM_ENV: "value" }, timeout: 1000, shell: true });

      expect(mockExeca).toHaveBeenCalledWith(process.execPath, [path.join(repo.root, "node_modules/lage/dist/lage.js"), "test"], {
        cwd: repo.root,
        env: { CUSTOM_ENV: "value" },
        timeout: 1000,
        shell: false,
      });
    });

    it.each([
      { name: "a missing script", script: undefined, error: /Missing root package script "test"/ },
      { name: "a command other than Lage", script: "node test", error: /must be a simple Lage command/ },
      { name: "chained commands", script: "lage test && echo unexpected", error: /unsupported characters/ },
      { name: "a pipeline", script: "lage test | cat", error: /unsupported characters/ },
      { name: "redirection", script: "lage test > test.log", error: /unsupported characters/ },
      { name: "glob expansion", script: "lage test *", error: /unsupported characters/ },
      { name: "double quotes", script: 'lage test --reporter "json"', error: /unsupported characters/ },
      { name: "single quotes", script: "lage test --reporter 'json'", error: /unsupported characters/ },
      { name: "Unix environment variable expansion", script: "lage test $UNEXPECTED_ARG", error: /unsupported characters/ },
      { name: "Windows environment variable expansion", script: "lage test %UNEXPECTED_ARG%", error: /unsupported characters/ },
      { name: "Windows delayed expansion", script: "lage test !UNEXPECTED_ARG!", error: /unsupported characters/ },
      { name: "Windows escape syntax", script: "lage test ^& echo unexpected", error: /unsupported characters/ },
      { name: "a newline", script: "lage test\necho unexpected", error: /unsupported characters/ },
      { name: "a tab", script: "lage\ttest", error: /unsupported characters/ },
    ])("rejects $name before starting a process", ({ script, error }) => {
      setScripts(script === undefined ? {} : { test: script });

      expect(() => repo.runLage("test")).toThrow(error);
      expect(mockExeca).not.toHaveBeenCalled();
    });
  });
});
