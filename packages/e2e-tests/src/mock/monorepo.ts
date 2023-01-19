import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as execa from "execa";

export class Monorepo {
  static tmpdir = os.tmpdir();

  root: string;
  nodeModulesPath: string;
  yarnPath: string;

  constructor(private name: string) {
    this.root = fs.mkdtempSync(path.join(Monorepo.tmpdir, `lage-monorepo-${name}-`));
    this.nodeModulesPath = path.join(this.root, "node_modules");
    this.yarnPath = path.join(this.root, ".yarn", "yarn.js");
  }

  init() {
    const options = { cwd: this.root };
    execa.sync("git", ["init"], options);
    execa.sync("git", ["config", "user.email", "you@example.com"], options);
    execa.sync("git", ["config", "user.name", "test user"], options);
    execa.sync("git", ["config", "commit.gpgsign", "false"], options);
    this.generateRepoFiles();
  }

  install() {
    const yogaPath = path.dirname(require.resolve("yoga-layout-prebuilt/package.json"));
    fs.cpSync(yogaPath, path.join(this.root, "node_modules/yoga-layout-prebuilt"), { recursive: true });
    fs.cpSync(path.join(__dirname, "..", "..", "yarn"), path.dirname(this.yarnPath), { recursive: true });
    execa.sync("node", [this.yarnPath, "install"], { cwd: this.root });
  }

  generateRepoFiles() {
    this.commitFiles({
      "package.json": {
        name: this.name,
        version: "0.1.0",
        private: true,
        workspaces: ["packages/*"],
        scripts: {
          bundle: `node ${this.yarnPath} lage bundle --reporter json --log-level silly`,
          transpile: `node ${this.yarnPath} lage transpile --reporter json --log-level silly`,
          build: `node ${this.yarnPath} lage build --reporter json --log-level silly`,
          writeInfo: `node ${this.yarnPath} lage info`,
          test: `node ${this.yarnPath} lage test --reporter json --log-level silly`,
          lint: `node ${this.yarnPath} lage lint --reporter json --log-level silly`,
          clear: `node ${this.yarnPath} lage cache --clear --reporter json --log-level silly`,
        },
        devDependencies: {
          "@lage-run/lage": path.resolve(__dirname, "..", "..", "..", "lage2"),
        },
      },
      "lage.config.js": `module.exports = {
        pipeline: {
          build: ['^build'],
          test: ['build'],
          lint: []
        }
      };`,
      ".gitignore": "node_modules",
    });
  }

  setLageConfig(contents: string) {
    this.commitFiles({
      "lage.config.js": contents,
    });
  }

  addPackage(name: string, internalDeps: string[] = [], scripts?: { [script: string]: string }) {
    return this.commitFiles({
      [`packages/${name}/build.js`]: `console.log('building ${name}');`,
      [`packages/${name}/test.js`]: `console.log('building ${name}');`,
      [`packages/${name}/lint.js`]: `console.log('linting ${name}');`,
      [`packages/${name}/package.json`]: {
        name,
        version: "0.1.0",
        scripts: scripts || {
          build: "node ./build.js",
          test: "node ./test.js",
          lint: "node ./lint.js",
        },
        dependencies: {
          ...(internalDeps &&
            internalDeps.reduce((deps, dep) => {
              return { ...deps, [dep]: "*" };
            }, {})),
        },
      },
    });
  }

  clone(origin: string) {
    return execa.sync("git", ["clone", origin], { cwd: this.root });
  }

  push(origin: string, branch: string) {
    return execa.sync("git", ["push", origin, branch], { cwd: this.root });
  }

  commitFiles(files: { [name: string]: string | Record<string, unknown> }, options: { executable?: boolean } = {}) {
    for (const [file, contents] of Object.entries(files)) {
      let out = "";
      if (typeof contents !== "string") {
        out = JSON.stringify(contents, null, 2);
      } else {
        out = contents;
      }

      const fullPath = path.join(this.root, file);

      if (!fs.existsSync(path.dirname(fullPath))) {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      }

      fs.writeFileSync(fullPath, out);

      if (options.executable) {
        fs.chmodSync(path.join(this.root, file), fs.constants.S_IXUSR | fs.constants.S_IRUSR | fs.constants.S_IROTH);
      }
    }

    execa.sync("git", ["add", ...Object.keys(files)], {
      cwd: this.root,
    });

    execa.sync("git", ["commit", "-m", "commit files"], { cwd: this.root });
  }

  run(command: string, args?: string[], silent?: boolean) {
    return execa.sync("yarn", [...(silent === true ? ["--silent"] : []), command, ...(args || [])], {
      cwd: this.root,
    });
  }

  cleanup() {
    fs.rmSync(this.root, { recursive: true });
  }
}
