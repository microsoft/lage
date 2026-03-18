import * as fs from "fs";
import * as path from "path";
import * as execa from "execa";
import { findGitRoot } from "workspace-tools";

import { glob } from "@lage-run/globby";
import { Monorepo as BaseMonorepo, type MonorepoInitParams as BaseMonorepoInitParams } from "@lage-run/monorepo-fixture";
import type { ConfigFileOptions } from "@lage-run/cli";

const lageRepoRoot = findGitRoot(__dirname);
const lagePackageRoot = path.join(lageRepoRoot, "packages/lage");
const externalPackageJsons = glob(["node_modules/glob-hasher/package.json", "node_modules/glob-hasher-*/package.json"], {
  cwd: lageRepoRoot,
  absolute: true,
});

const yarnGlob = ".yarn/releases/yarn-*.cjs";
/** Path to the lage repo's current saved yarn release */
const yarnPath = glob([yarnGlob], {
  cwd: lageRepoRoot,
  absolute: true,
})[0];
if (!yarnPath) {
  throw new Error("Could not find yarn release under " + path.join(lageRepoRoot, yarnGlob));
}

/** E2E monorepo init params */
export interface MonorepoInitParams extends BaseMonorepoInitParams {
  lageConfig?: string | ConfigFileOptions;
  /** Root package.json scripts override */
  scripts?: Record<string, string>;
}

/** Relative path to yarn binary from within the fixture */
const yarnRelPath = ".yarn/yarn.cjs";

export class Monorepo extends BaseMonorepo {
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
      ].join("\n"),
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
   * Link lage's external dependencies and run `yarn install` (SLOW)
   */
  public async install(): Promise<void> {
    for (const externalPackageJson of externalPackageJsons) {
      const packagePath = path.dirname(externalPackageJson);
      const name = JSON.parse(fs.readFileSync(path.join(packagePath, "package.json"), "utf-8")).name;
      fs.cpSync(packagePath, path.join(this.nodeModulesPath, name), { recursive: true });
    }

    fs.mkdirSync(path.dirname(this.yarnPath), { recursive: true });
    fs.cpSync(yarnPath, this.yarnPath);
    execa.sync(`"${process.execPath}"`, [`"${this.yarnPath}"`, "install", "--no-immutable"], { cwd: this.root, shell: true });
  }

  public runServer(tasks: string[]): execa.ExecaChildProcess<string> {
    const cp = execa.default(process.execPath, [path.join(this.root, "node_modules/lage/dist/lage-server.js"), "--tasks", ...tasks], {
      cwd: this.root,
      detached: true,
      stdio: "ignore",
    });

    if (cp && !cp.pid) {
      throw new Error("Failed to start server");
    }

    return cp;
  }
}
