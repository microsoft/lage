import * as fs from "fs";
import * as path from "path";
import * as execa from "execa";
import { findGitRoot, getPackageInfo } from "workspace-tools";

import { glob } from "@lage-run/globby";
import { Monorepo as BaseMonorepo, type MonorepoInitParams as BaseMonorepoInitParams } from "@lage-run/monorepo-fixture";
import type { ConfigFileOptions } from "@lage-run/cli";

/** Absolute root path of the lage repo */
const lageRepoRoot = findGitRoot(__dirname);
/** Absolute path to the lage package within the repo */
const lagePackageRoot = path.join(lageRepoRoot, "packages/lage");

/** Relative path to yarn binary from within the fixture */
const yarnRelPath = ".yarn/yarn.cjs";

/** E2E monorepo init params */
export interface MonorepoInitParams extends BaseMonorepoInitParams {
  lageConfig?: string | ConfigFileOptions;
  /** Root package.json scripts override */
  scripts?: Record<string, string>;
}

export class Monorepo extends BaseMonorepo {
  private static lageResolutions: Record<string, string> | undefined;
  private static yarnBinaryContents: string | undefined;

  /** Path to the fixture's copy of yarn */
  private readonly yarnPath: string;

  constructor(name: string) {
    super(name);
    this.yarnPath = path.join(this.root, yarnRelPath);
  }

  /**
   * Init the repo and files. Note you must separately call `install()` before running lage.
   *
   * The default fixture for the e2e tests includes a bunch of scripts which mostly run
   * `lage <script> --reporter json --log-level silly` so the output can be parsed with `parseNdJson`.
   *
   * For lage's runtime dependencies, the fixture uses resolutions to reference either the
   * real dep versions from the lage repo if relevant, or placeholder empty packages, instead of
   * installing the whole dep tree from the registry.
   */
  public async init(params: MonorepoInitParams = {}): Promise<void> {
    if (params.fixturePath) {
      throw new Error("Custom fixture paths are not currently supported in the e2e monorepo helper");
    }

    await super.gitInit();

    const {
      lageConfig = {
        pipeline: {
          build: ["^build"],
          test: ["build"],
          lint: [],
          extra: [],
        },
        npmClient: "yarn",
      },
      scripts,
      packages = {},
      extraFiles,
    } = params;

    this.writeFiles({
      ".yarnrc.yml": [
        "nodeLinker: node-modules",
        // Disable postinstall script execution
        "enableScripts: false",
        // Cache packages entirely within the fixture to reduce race conditions or other issues
        `yarnPath: ${yarnRelPath}`,
        "cacheFolder: .yarn/cache",
        "globalFolder: .yarn/global",
        "enableGlobalCache: false",
        "enableMirror: false",
        // This will cause yarn to error if any new dependencies accidentally get past the resolutions
        // and cause network requests. Could be reconsidered if we have a test in the future that really
        // needs to install from the registry, but it should be avoided if possible.
        "npmRegistryServer: http://should-not-hit-registry.local",
      ].join("\n"),
      [yarnRelPath]: Monorepo.getYarnBinaryContents(),
      "package.json": {
        name: this.name.replace(/ /g, "-"),
        version: "0.1.0",
        private: true,
        workspaces: ["packages/*"],
        scripts: scripts || {
          lage: `lage`,
          bundle: `lage bundle --reporter json --log-level silly`,
          transpile: `lage transpile --reporter json --log-level silly`,
          build: `lage build --reporter json --log-level silly`,
          writeInfo: `lage info`,
          test: `lage test --reporter json --log-level silly`,
          lint: `lage lint --reporter json --log-level silly`,
          clear: `lage cache --clear --reporter json --log-level silly`,
          extra: `lage extra --clear --reporter json --log-level silly`,
        },
        devDependencies: {
          lage: lagePackageRoot,
        },
        // Use resolutions to fix lage's external deps to copy the ones from the repo
        resolutions: { ...Monorepo.getLageResolutions() },
      },
      "lage.config.js": typeof lageConfig === "string" ? lageConfig : `module.exports = ${JSON.stringify(lageConfig, null, 2)};`,
      ".gitignore": ["node_modules", ".yarn"].join("\n"),
      ...extraFiles,
    });

    const packagesExtra: typeof packages = {};
    for (const [name, pkg] of Object.entries(packages)) {
      packagesExtra[name] = {
        ...pkg,
        extraFiles: {
          ...pkg.extraFiles,
          "extra.js": `console.log('extra ${name}');`,
        },
      };
    }
    super.addPackages(packagesExtra);

    // Commit all at the end for efficiency
    execa.sync("git", ["add", "."], { cwd: this.root });
    execa.sync("git", ["commit", "-m", "test"], { cwd: this.root });
  }

  /**
   * Run `yarn install` for the fixture
   */
  public async install(): Promise<void> {
    execa.sync(`"${process.execPath}"`, [`"${this.yarnPath}"`, "install", "--no-immutable"], { cwd: this.root, shell: true });
  }

  public runServer(tasks: string[], port: number): execa.ExecaChildProcess<string> {
    const lageServerPath = path.join(this.root, "node_modules/lage/dist/lage-server.js");
    const cp = execa.default(process.execPath, [lageServerPath, "--server", `localhost:${port}`, "--tasks", ...tasks], {
      cwd: this.root,
      detached: true,
      stdio: "ignore",
    });

    if (cp && !cp.pid) {
      throw new Error("Failed to start server");
    }

    return cp;
  }

  /** Get package.json resolutions for lage's external dependencies */
  private static getLageResolutions(): Record<string, string> {
    if (Monorepo.lageResolutions) {
      return Monorepo.lageResolutions;
    }

    const lagePackage = getPackageInfo(lagePackageRoot)!;
    // If this changes, the fixture will need to be updated to account for additional deps
    expect(lagePackage.dependencies).toEqual({ "glob-hasher": expect.any(String) });
    expect(lagePackage.optionalDependencies).toEqual({ fsevents: expect.any(String) });

    // Find glob-hasher's optional platform deps and figure out which is installed.
    // ASSUMPTION: This only works with hoisted node_modules. If we use a different linker in the future,
    // it will need to be updated to use proper resolution (createRequire from relevant package).
    const globHasherPath = path.join(lageRepoRoot, "node_modules/glob-hasher");
    const globHasherDepNames = Object.keys(getPackageInfo(globHasherPath)!.optionalDependencies!);

    // There should be only this platform's glob-hasher-* implementation installed
    const globHasherPlatforms = glob(["node_modules/glob-hasher-*/package.json"], { cwd: lageRepoRoot, absolute: true });
    expect(globHasherPlatforms).toHaveLength(1);
    const globHasherPlatformPath = path.dirname(globHasherPlatforms[0]);
    const globHasherPlatformName = path.basename(globHasherPlatformPath);

    // Link unwanted packages to the empty placeholder package
    const emptyPath = path.join(__dirname, "empty");

    Monorepo.lageResolutions = {
      fsevents: emptyPath,
      "glob-hasher": globHasherPath,
      // Use empty deps for the other glob-hasher platforms
      ...Object.fromEntries(globHasherDepNames.map((depName) => [depName, emptyPath])),
      // and override the current one with the real implementation
      [globHasherPlatformName]: globHasherPlatformPath,
    };

    return Monorepo.lageResolutions;
  }

  private static getYarnBinaryContents(): string {
    if (!Monorepo.yarnBinaryContents) {
      const yarnGlob = ".yarn/releases/yarn-*.cjs";
      /** Path to the lage repo's current saved yarn release */
      const yarnPath = glob([yarnGlob], { cwd: lageRepoRoot, absolute: true })[0];
      if (!yarnPath) {
        throw new Error("Could not find yarn release under " + path.join(lageRepoRoot, yarnGlob));
      }
      Monorepo.yarnBinaryContents = fs.readFileSync(yarnPath, "utf-8");
    }
    return Monorepo.yarnBinaryContents;
  }
}
