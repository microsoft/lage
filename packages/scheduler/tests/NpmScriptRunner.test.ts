import { Logger } from "@lage-run/logger";
import { Target } from "@lage-run/target-graph";
import { NpmScriptRunner } from "../src/runners/NpmScriptRunner";
import path from "path";
import { AbortController } from "abort-controller";
import { waitFor } from "./waitFor";

describe("NpmScriptRunner", () => {
  it("can kill the child process based on abort signal", async () => {
    const logger = new Logger();
    const abortController = new AbortController();

    const runner = new NpmScriptRunner({
      logger,
      nodeOptions: "",
      npmCmd: path.resolve(__dirname, "fixtures/fakeNpm"),
      taskArgs: [],
    });

    const runPromise = runner.run(
      {
        cwd: path.resolve(__dirname, "fixtures/package-a"),
        dependencies: [],
        label: "",
        id: "a#build",
        task: "build",
        packageName: "a",
      } as Target,
      abortController.signal
    ).catch(() => {
      /* ignored */
    });

    await waitFor(() => !!runner.childProcess);

    abortController.abort();
    
    await waitFor(() => !!runner.childProcess && runner.childProcess.killed);

    return expect(runPromise).rejects;
  });
});
