import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as execa from "execa";

import { glob } from "@lage-run/globby";

export class Monorepo {
  static tmpdir = os.tmpdir();

  root: string;
  nodeModulesPath: string;
  yarnPath: string;

  static externalPackageJsonGlobs = ["node_modules/glob-hasher/package.json", "node_modules/glob-hasher-*/package.json"];

  static externalPackageJsons = glob(Monorepo.externalPackageJsonGlobs, {
    cwd: path.join(__dirname, "..", "..", "..", ".."),
    gitignore: false,
  })!.map((f) => path.resolve(path.join(__dirname, "..", "..", "..", ".."), f));

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
    for (const packagePath of Monorepo.externalPackageJsons.map((p) => path.dirname(p))) {
      const name = JSON.parse(fs.readFileSync(path.join(packagePath, "package.json"), "utf-8")).name;
      fs.cpSync(packagePath, path.join(this.root, "node_modules", name), { recursive: true });
    }

    fs.cpSync(path.resolve(__dirname, "..", "..", "yarn"), path.dirname(this.yarnPath), { recursive: true });
    execa.sync(`"${process.execPath}"`, [`"${this.yarnPath}"`, "install", "--no-immutable"], { cwd: this.root, shell: true });
  }

  generateRepoFiles() {
    this.commitFiles({
      ".yarnrc.yml": `yarnPath: "${this.yarnPath}"\ncacheFolder: "${this.root}/.yarn/cache"\nnodeLinker: node-modules`,
      "package.json": {
        name: this.name.replace(/ /g, "-"),
        version: "0.1.0",
        private: true,
        workspaces: ["packages/*"],
        scripts: {
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
          lage: path.resolve(__dirname, "..", "..", "..", "lage"),
        },
        packageManager: "yarn@1.22.19",
      },
      "lage.config.js": `module.exports = {
        pipeline: {
          build: ['^build'],
          test: ['build'],
          lint: [],
          extra: []
        },
        npmClient: 'yarn'
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
      [`packages/${name}/test.js`]: `console.log('testing ${name}');`,
      [`packages/${name}/lint.js`]: `console.log('linting ${name}');`,
      [`packages/${name}/extra.js`]: `console.log('extra ${name}');`,
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
    return execa.sync(process.execPath, [this.yarnPath, ...(silent === true ? ["--silent"] : []), command, ...(args || [])], {
      cwd: this.root,
    });
  }

  runServer() {
    return execa.default(process.execPath, [path.join(this.root, "node_modules/lage/dist/lage-server.js")], {
      cwd: this.root,
      detached: true,
      stdio: "ignore",
    });
  }

  async cleanup() {
    const maxRetries = 5;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        fs.rmSync(this.root, { recursive: true });
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}
