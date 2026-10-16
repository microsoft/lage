import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { PipelineDefinition } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import { Monorepo } from "@lage-run/test-utilities";
import path from "path";
import { addGitObserver, getPackageInfos, type GitObserver, type PackageInfo, type PackageInfos } from "workspace-tools";
import {
  createTargetGraph,
  createFilteredTargetGraph,
  type CreateTargetGraphOptions,
  type CreateFilteredTargetGraphOptions,
} from "../commands/run/createTargetGraph.js";
import type { ChangedFiles } from "../filter/getChangedFiles.js";
import type { Target } from "@lage-run/target-graph";

const ROOT = path.resolve("/fake/root");

describe("createTargetGraph", () => {
  let monorepo: Monorepo | undefined;
  let stopObserving: (() => void) | undefined;

  /** Call `createTargetGraph` and return a subset of the fields for each target. */
  async function createTargetGraphWrapper({
    extraFields,
    ...params
  }: Partial<Omit<CreateTargetGraphOptions, "config">> & {
    config?: Partial<CreateTargetGraphOptions["config"]>;
    extraFields?: (keyof Target)[];
  }): Promise<Partial<Target>[]> {
    const gitObserver = jest.fn<GitObserver>();
    stopObserving = addGitObserver(gitObserver);

    const root = params.root ?? ROOT;
    const packageInfos = params.packageInfos ?? (root === ROOT ? {} : getPackageInfos(root));
    const targetGraph = await createTargetGraph({
      packageInfos,
      packages: Object.keys(packageInfos),
      tasks: [],
      changes: undefined,
      ...params,
      root,
      config: {
        enableTargetConfigMerging: false,
        enablePhantomTargetOptimization: false,
        pipeline: {},
        cacheOptions: { outputGlob: [] },
        priorities: [],
        ...params.config,
      },
    });

    expect(gitObserver).not.toHaveBeenCalled();

    return [...targetGraph.targets.values()]
      .map((target) => ({
        id: target.id,
        dependencies: target.dependencies,
        ...Object.fromEntries(extraFields?.map((field) => [field, target[field]]) ?? []),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  function stubPackage(args: { name: string; deps?: string[]; scripts?: string[]; extra?: object }): PackageInfo {
    return {
      name: args.name,
      packageJsonPath: path.join(ROOT, "packages", args.name),
      version: "1.0.0",
      dependencies: (args.deps || []).reduce((depMap, dep) => ({ ...depMap, [dep]: "*" }), {}),
      scripts: (args.scripts || []).reduce((scriptMap, script) => ({ ...scriptMap, [script]: `echo ${script}` }), {}),
      ...args.extra,
    } as PackageInfo;
  }

  afterEach(async () => {
    stopObserving?.();
    stopObserving = undefined;
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it.each([
    { packages: ["foo1", "foo2"], repoWideChangedFiles: ["tsconfig.json"], expectedTargets: ["__start", "foo1#build", "foo2#build"] },
    { packages: ["foo1"], repoWideChangedFiles: ["tsconfig.json"], expectedTargets: ["__start", "foo1#build"] },
    { packages: ["foo1", "foo2"], repoWideChangedFiles: [], expectedTargets: ["__start", "foo1#build", "foo2#build"] },
  ])(
    "creates targets from prepared packages $packages and repo-wide changes $repoWideChangedFiles",
    async ({ packages, repoWideChangedFiles, expectedTargets }) => {
      monorepo = new Monorepo("createTargetGraph-repoWideChanges");
      await monorepo.init({
        packages: {
          foo1: { scripts: { build: "echo build" } },
          foo2: { scripts: { build: "echo build" } },
        },
      });

      const result = await createTargetGraphWrapper({
        root: monorepo.root,
        packages,
        changes: {
          status: "success",
          changedFiles: ["packages/foo1/test.txt", "tsconfig.json"],
          repoWideChangedFiles,
        },
        config: { pipeline: { build: [] }, cacheOptions: { outputGlob: ["lib/**"] } },
        tasks: ["build"],
        extraFields: ["inputs", "outputs"],
      });
      expect(result.map(({ id }) => id)).toEqual(expectedTargets);
      expect(result.find(({ id }) => id === "foo1#build")?.outputs).toEqual(["lib/**"]);
    }
  );

  it.each<Exclude<ChangedFiles, { status: "success" }> | undefined>([undefined, { status: "skipped" }, { status: "failed" }])(
    "does not create staged targets when changes is %p",
    async (changes) => {
      const targets = await createTargetGraphWrapper({
        root: ROOT,
        packages: ["foo1"],
        changes,
        config: {
          pipeline: { build: { stagedTarget: { type: "npmScript", options: { script: "build" } } } },
        },
        tasks: ["build"],
        packageInfos: { foo1: stubPackage({ name: "foo1", scripts: ["build"] }) },
      });

      const stagedTargets = targets.filter((target) => target.id?.startsWith("Δ"));
      expect(stagedTargets).toHaveLength(0);
    }
  );

  it.each<{ changes: Extract<ChangedFiles, { status: "success" }>; expectedStaged: boolean }>([
    { changes: { status: "success", changedFiles: [], repoWideChangedFiles: [] }, expectedStaged: false },
    { changes: { status: "success", changedFiles: ["packages/foo1/file.ts"], repoWideChangedFiles: [] }, expectedStaged: true },
    {
      changes: { status: "success", changedFiles: ["lage.config.js"], repoWideChangedFiles: ["lage.config.js"] },
      expectedStaged: false,
    },
  ])("only creates staged targets for successful non-repo-wide changes: $changes", async ({ changes, expectedStaged }) => {
    const targets = await createTargetGraphWrapper({
      packages: ["foo1"],
      changes,
      config: {
        pipeline: { build: { stagedTarget: { type: "npmScript", options: { script: "build" } } } },
      },
      tasks: ["build"],
      packageInfos: { foo1: stubPackage({ name: "foo1", scripts: ["build"] }) },
      extraFields: ["options"],
    });

    const stagedTargets = targets.filter((target) => target.id?.startsWith("Δ"));
    expect(stagedTargets).toHaveLength(expectedStaged ? 1 : 0);
    if (expectedStaged) {
      expect(stagedTargets[0].options?.taskArgs).toEqual(changes.changedFiles);
    }
  });

  it("creates basic graph with separate nodes", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", scripts: ["build"], deps: ["foo2"] }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      test: ["build"],
    };

    const result = await createTargetGraphWrapper({
      tasks: ["build"],
      packageInfos,
      config: { pipeline },
    });
    expect(result).toEqual([
      { id: "__start", dependencies: [] },
      { id: "foo1#build", dependencies: ["__start", "foo2#build"] },
      { id: "foo2#build", dependencies: ["__start"] },
    ]);
  });

  it("creates basic graph spanning tasks", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", scripts: ["build"], deps: ["foo2"] }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      test: ["build"],
    };

    const result = await createTargetGraphWrapper({
      packageInfos,
      tasks: ["build", "test"],
      config: { pipeline },
    });
    expect(result).toEqual([
      { id: "__start", dependencies: [] },
      { id: "foo1#build", dependencies: ["__start", "foo2#build"] },
      { id: "foo1#test", dependencies: ["__start", "foo1#build"] },
      { id: "foo2#build", dependencies: ["__start"] },
      { id: "foo2#test", dependencies: ["__start", "foo2#build"] },
    ]);
  });

  it("merges dependencies in pipeline with package.json override", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", scripts: ["build"], deps: ["foo2"], extra: { lage: { build: ["foo4#build"] } } }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
      foo3: stubPackage({ name: "foo3", scripts: ["build"] }),
      foo4: stubPackage({ name: "foo4", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      "foo1#build": ["foo3#build"],
    };

    const result = await createTargetGraphWrapper({
      packageInfos,
      tasks: ["build"],
      config: { pipeline, enableTargetConfigMerging: true },
    });
    expect(result).toEqual([
      { id: "__start", dependencies: [] },
      { id: "foo1#build", dependencies: ["__start", "foo2#build", "foo3#build", "foo4#build"] },
      { id: "foo2#build", dependencies: ["__start"] },
      { id: "foo3#build", dependencies: ["__start"] },
      { id: "foo4#build", dependencies: ["__start"] },
    ]);
  });

  it("merges inputs and outputs in pipeline with package.json override", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({
        name: "foo1",
        deps: ["foo2"],
        scripts: ["build"],
        extra: { lage: { build: { inputs: ["tsconfig.json"], outputs: ["dist/**"] } } },
      }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: { inputs: ["src/**"], outputs: ["lib/**"] },
      "foo1#build": {
        inputs: ["src/**", "myTool.config"],
        dependsOn: ["foo2#build"],
      },
    };

    const result = await createTargetGraphWrapper({
      packageInfos,
      tasks: ["build"],
      config: { pipeline, enableTargetConfigMerging: true },
      extraFields: ["inputs", "outputs"],
    });
    expect(result).toEqual([
      { id: "__start", dependencies: [] },
      {
        id: "foo1#build",
        dependencies: ["__start", "foo2#build"],
        inputs: ["src/**", "src/**", "myTool.config", "tsconfig.json"],
        outputs: ["lib/**", "dist/**"],
      },
      {
        id: "foo2#build",
        dependencies: ["__start"],
        inputs: ["src/**"],
        outputs: ["lib/**"],
      },
    ]);
  });

  describe("createFilteredTargetGraph", () => {
    /** Prepare a filtered graph and verify only the expected change-collection commands run. */
    async function getFilteredTargetGraphWrapper(params: {
      options?: Partial<CreateFilteredTargetGraphOptions["options"]>;
      config?: Partial<CreateFilteredTargetGraphOptions["config"]>;
      stagedConfig?: "root" | "package";
      expectGitCalls: number;
    }) {
      const packageInfos = getPackageInfos(monorepo!.root);
      const stagedPipeline: PipelineDefinition = {
        build: { stagedTarget: { type: "npmScript", options: { script: "build" } } },
      };
      if (params.stagedConfig === "package") {
        packageInfos.a.lage = stagedPipeline;
      }
      const gitObserver = jest.fn<GitObserver>();
      stopObserving = addGitObserver(gitObserver);

      const { packages, targetGraph } = await createFilteredTargetGraph({
        root: monorepo!.root,
        packageInfos,
        logger: createLogger(),
        options: { dependencies: false, dependents: false, ignore: [], ...params.options },
        config: {
          pipeline: params.stagedConfig === "root" ? stagedPipeline : { build: [] },
          cacheOptions: { outputGlob: [] },
          priorities: [],
          enableTargetConfigMerging: false,
          enablePhantomTargetOptimization: false,
          ignore: [],
          repoWideChanges: [],
          ...params.config,
        },
        tasks: ["build"],
      });

      expect(gitObserver).toHaveBeenCalledTimes(params.expectGitCalls);
      return {
        packages: [...packages].sort(),
        targets: [...targetGraph.targets.values()].sort((a, b) => a.id.localeCompare(b.id)),
      };
    }

    it("without since, builds normal scoped targets even with staged configuration", async () => {
      monorepo = new Monorepo("createFilteredTargetGraph-withoutSince");
      await monorepo.init({ packages: { a: {}, b: {} } });

      const { packages, targets } = await getFilteredTargetGraphWrapper({
        options: { scope: ["a"] },
        stagedConfig: "root",
        expectGitCalls: 0,
      });
      expect(packages).toEqual(["a"]);
      expect(targets.map(({ id }) => id)).toEqual(["__start", "a#build"]);
    });

    it.each(["scope", "to"] as const)("with `%s` and no staged configuration, skips git detection", async (arg) => {
      monorepo = new Monorepo("createFilteredTargetGraph-withoutStagedTargets");
      await monorepo.init({ packages: { a: {}, b: {} } });
      monorepo.writeFiles({ "packages/b/changed.ts": "changed" });

      const { packages, targets } = await getFilteredTargetGraphWrapper({
        options: { since: "HEAD", [arg]: ["a"] },
        expectGitCalls: 0,
      });
      expect(packages).toEqual(["a"]);
      expect(targets.map(({ id }) => id)).toEqual(["__start", "a#build"]);
    });

    it.each<{ desc: string; stagedConfig?: "root" }>([
      { desc: "without staged targets" },
      { desc: "and shares the snapshot with staged targets", stagedConfig: "root" },
    ])("when unscoped, collects changes once $desc", async ({ stagedConfig }) => {
      monorepo = new Monorepo("createFilteredTargetGraph-unscoped");
      await monorepo.init({ packages: { a: {}, b: {} } });
      monorepo.writeFiles({ "packages/a/changed.ts": "changed" });

      const { packages, targets } = await getFilteredTargetGraphWrapper({
        options: { since: "HEAD" },
        stagedConfig,
        expectGitCalls: 4,
      });
      expect(packages).toEqual(["a"]);
      const stagedTargets = targets.filter(({ id }) => id.startsWith("Δ"));
      expect(stagedTargets).toHaveLength(stagedConfig ? 1 : 0);
      if (stagedConfig) {
        expect(stagedTargets[0].options?.taskArgs).toEqual(["packages/a/changed.ts"]);
      }
    });

    it.each<{
      desc: string;
      options: Partial<CreateFilteredTargetGraphOptions["options"]>;
      stagedConfig: "root" | "package";
      expected: string[];
    }>([
      {
        desc: "includes scoped dependents with root staged configuration",
        options: { scope: ["a"], dependents: true },
        stagedConfig: "root",
        expected: ["a", "b"],
      },
      {
        desc: "excludes to dependents with root staged configuration",
        options: { to: ["a"], dependents: true },
        stagedConfig: "root",
        expected: ["a"],
      },
      {
        desc: "includes to dependencies with package-level staged configuration",
        options: { to: ["b"], dependencies: true, dependents: true },
        stagedConfig: "package",
        expected: ["a", "b"],
      },
    ])("collects changes once and $desc", async ({ options, stagedConfig, expected }) => {
      monorepo = new Monorepo("createFilteredTargetGraph-scopedStagedTargets");
      await monorepo.init({ packages: { a: {}, b: { internalDeps: ["a"] }, c: {} } });
      monorepo.writeFiles({ "packages/c/changed.ts": "changed outside scope" });

      const { packages, targets } = await getFilteredTargetGraphWrapper({
        options: { since: "HEAD", ...options },
        stagedConfig,
        expectGitCalls: 4,
      });
      expect(packages).toEqual(expected);
      const stagedTargets = targets.filter(({ id }) => id.startsWith("Δ"));
      expect(stagedTargets).toHaveLength(1);
      expect(stagedTargets[0].options?.taskArgs).toEqual(["packages/c/changed.ts"]);
    });

    it.each([
      { desc: "keeps normal scoped targets for repo-wide changes", since: "HEAD", scope: ["a"], expected: ["a"], expectGitCalls: 4 },
      {
        desc: "keeps all normal targets after failed detection without retrying",
        since: "missing-ref",
        scope: undefined,
        expected: ["a", "b"],
        expectGitCalls: 1,
      },
    ])("with staged configuration, $desc", async ({ since, scope, expected, expectGitCalls }) => {
      monorepo = new Monorepo("createFilteredTargetGraph-disabledStagedTargets");
      await monorepo.init({ packages: { a: {}, b: {} } });
      monorepo.writeFiles({ "packages/b/changed.ts": "changed", "repo-wide.txt": "repo-wide change" });

      const { packages, targets } = await getFilteredTargetGraphWrapper({
        options: { since, scope },
        config: { repoWideChanges: ["repo-wide.txt"] },
        stagedConfig: "root",
        expectGitCalls,
      });
      expect(packages).toEqual(expected);
      expect(targets.map(({ id }) => id)).toEqual(["__start", ...expected.map((packageName) => `${packageName}#build`)]);
    });
  });
});
