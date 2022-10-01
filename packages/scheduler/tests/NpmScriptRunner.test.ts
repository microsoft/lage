import "child_process";
import { AbortController } from "abort-controller";
import { ChildProcess } from "child_process";
import { getTargetId, Target } from "@lage-run/target-graph";
import { Logger, LogLevel, Reporter } from "@lage-run/logger";
import { NpmScriptRunner } from "../src/runners/NpmScriptRunner";
import { waitFor } from "./waitFor";
import os from "os";
import path from "path";

let childProcesses: Map<string, ChildProcess> = new Map();

function getChildProcessKey(packageName: string, task: string) {
  const testName = expect.getState().currentTestName!.replace(/ /g, "_");
  const id = getTargetId(packageName, task);
  return `${testName}:${id}`;
}

jest.mock("child_process", () => {
  const originalModule = jest.requireActual("child_process");

  // Mock the default export and named export 'foo'
  return {
    __esModule: true,
    ...originalModule,
    spawn(cmd: string, args: string[], options: any) {
      const cp = originalModule.spawn.apply(originalModule, [cmd, args, options]);
      const key = getChildProcessKey(options.env.LAGE_PACKAGE_NAME, options.env.LAGE_TASK);
      childProcesses.set(key, cp);
      return cp;
    },
  };
});

function createTarget(packageName: string): Target {
  return {
    cwd: path.resolve(__dirname, "fixtures/package-a"),
    dependencies: [],
    dependents: [],
    depSpecs: [],
    label: "",
    id: `${packageName}#build`,
    task: "build",
    packageName,
  };
}

describe("NpmScriptRunner", () => {
  const npmCmd = path.join(__dirname, "fixtures", "fakeNpm" + (os.platform() === "win32" ? ".cmd" : ""));

  it("can run a npm script to completion", async () => {
    const logger = new Logger();

    const abortController = new AbortController();

    const runner = new NpmScriptRunner({
      logger,
      nodeOptions: "",
      npmCmd,
      taskArgs: ["--sleep=50"],
    });

    const target = createTarget("a");

    const exceptionSpy = jest.fn();
    const runPromise = runner.run(target, abortController.signal).catch(() => exceptionSpy());

    await waitFor(() => childProcesses.has(getChildProcessKey("a", target.task)));

    await runPromise;

    expect(exceptionSpy).not.toHaveBeenCalled();
  });

  it("sets up the environment variables relevant to lage", async () => {
    const logger = new Logger();

    let entries: any[] = [];
    logger.addReporter({
      logLevel: LogLevel.verbose,
      log(entry) {
        entries.push(entry);
      },
      summarize(_ctx) {},
    } as Reporter);

    const abortController = new AbortController();

    const runner = new NpmScriptRunner({
      logger,
      nodeOptions: "",
      npmCmd,
      taskArgs: ["--sleep=50"],
    });

    const target = createTarget("a");

    const exceptionSpy = jest.fn();

    await runner.run(target, abortController.signal).catch(() => exceptionSpy());

    const envEntry = entries
      .map((entry) => {
        try {
          const obj = JSON.parse(entry.msg);

          if (obj.LAGE_PACKAGE_NAME === target.packageName! && obj.LAGE_TASK === target.task) {
            return obj;
          }
        } catch (e) {}

        return undefined;
      })
      .filter((entry) => entry !== undefined)[0];

    expect(envEntry.LAGE_PACKAGE_NAME).toBe(target.packageName!);
    expect(envEntry.LAGE_TASK).toBe(target.task);
  });

  it("can kill the child process based on abort signal", async () => {
    const logger = new Logger();

    const abortController = new AbortController();

    const runner = new NpmScriptRunner({
      logger,
      nodeOptions: "",
      npmCmd,
      taskArgs: ["--sleep=50000"],
    });

    const target = createTarget("a");

    const exceptionSpy = jest.fn();
    const runPromise = runner.run(target, abortController.signal).catch(() => exceptionSpy());

    await waitFor(() => childProcesses.has(getChildProcessKey("a", target.task)));

    abortController.abort();

    await waitFor(
      () => childProcesses.has(getChildProcessKey("a", target.task)) && childProcesses.get(getChildProcessKey("a", target.task))!.killed
    );

    await runPromise;

    expect(exceptionSpy).toHaveBeenCalled();
  });

  it("can kill many concurrent child processes based on abort signal", async () => {
    const logger = new Logger();
    const abortController = new AbortController();

    const runner = new NpmScriptRunner({
      logger,
      nodeOptions: "",
      npmCmd,
      taskArgs: ["--sleep=50000"],
    });

    const fakePackages = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const fakeExceptionSpies: { [key: string]: () => void } = {};
    for (const packageName of fakePackages) {
      fakeExceptionSpies[packageName] = jest.fn();
    }

    let runPromises = fakePackages.map((packageName) =>
      runner.run(createTarget(packageName), abortController.signal).catch(() => {
        fakeExceptionSpies[packageName]();
      })
    );

    await waitFor(() =>
      fakePackages.reduce<boolean>((acc, packageName) => acc && childProcesses.has(getChildProcessKey(packageName, "build")), true)
    );

    abortController.abort();

    await waitFor(() =>
      fakePackages.reduce<boolean>(
        (acc, packageName) => acc && !!childProcesses.get(getChildProcessKey(packageName, "build"))?.killed,
        true
      )
    );

    await Promise.all(runPromises);

    for (const packageName of fakePackages) {
      expect(fakeExceptionSpies[packageName]).toHaveBeenCalled();
    }
  });
});
