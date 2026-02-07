import * as fs from "fs";
import * as path from "path";
import * as execa from "execa";

import { glob } from "@lage-run/globby";
import { Monorepo as BaseMonorepo } from "@lage-run/monorepo-fixture";

const externalPackageJsonGlobs = ["node_modules/glob-hasher/package.json", "node_modules/glob-hasher-*/package.json"];
const externalPackageJsons = glob(externalPackageJsonGlobs, {
  cwd: path.join(__dirname, "..", "..", "..", ".."),
  gitignore: false,
})!.map((f) => path.resolve(path.join(__dirname, "..", "..", "..", ".."), f));

export class Monorepo extends BaseMonorepo {
  private readonly yarnPath: string;

  constructor(name: string) {
    super(name, "lage-monorepo");
    this.yarnPath = path.join(this.root, ".yarn", "yarn.js");
  }

  public override async install(): Promise<void> {
    for (const externalPackageJson of externalPackageJsons) {
      const packagePath = path.dirname(externalPackageJson);
      const name = JSON.parse(fs.readFileSync(path.join(packagePath, "package.json"), "utf-8")).name;
      fs.cpSync(packagePath, path.join(this.root, "node_modules", name), { recursive: true });
    }

    fs.cpSync(path.resolve(__dirname, "..", "..", "yarn"), path.dirname(this.yarnPath), { recursive: true });
    execa.sync(`"${process.execPath}"`, [`"${this.yarnPath}"`, "install", "--no-immutable"], { cwd: this.root, shell: true });
  }

  protected override async generateRepoFiles(): Promise<void> {
    await this.commitFiles({
      ".yarnrc.yml": `yarnPath: "${this.yarnPath.replace(/\\/g, "/")}"\ncacheFolder: "${this.root.replace(
        /\\/g,
        "/"
      )}/.yarn/cache"\nnodeLinker: node-modules`,
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

  public override async addPackage(name: string, internalDeps: string[] = [], scripts?: { [script: string]: string }): Promise<void> {
    return super.addPackage(name, internalDeps, scripts, {
      [`packages/${name}/extra.js`]: `console.log('extra ${name}');`,
    });
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
