import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";

describe("lageserver", () => {
  let repo: Monorepo | undefined;

  afterEach(() => {
    repo?.cleanup();
    repo = undefined;
  });

  it("connects to a running server", async () => {
    repo = new Monorepo("basics");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const serverProcess = repo.runServer();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const results = repo.run("lage", ["exec", "--server", "--", "a", "build"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    serverProcess.kill();

    expect(jsonOutput.find((entry) => entry.data?.target?.id === "a#build" && entry.msg === "Finished")).toBeTruthy();
  });
});
