import path from "path";
import { Monorepo } from "@lage-run/monorepo-fixture";
const fixturesPath = path.join(__dirname, "..", "__fixtures__");

import { getYarnWorkspaces, getPnpmWorkspaces, getRushWorkspaces } from "workspace-tools";

export async function filterDependenciesInYarnFixture(fixture: string, filterFunction: any) {
  const monorepo = new Monorepo("monorepo");
  await monorepo.init(path.join(fixturesPath, fixture));
  const packageRoot = monorepo.root;

  const workspacesPackageInfo = getYarnWorkspaces(packageRoot);

  const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

  const filteredDependencies = filterFunction(dependencies, workspacesPackageInfo);

  return filteredDependencies;
}

export async function filterDependenciesInPnpmFixture(fixture: string, filterFunction: any) {
  const monorepo = new Monorepo("monorepo");
  await monorepo.init(path.join(fixturesPath, fixture));
  const packageRoot = monorepo.root;

  const workspacesPackageInfo = getPnpmWorkspaces(packageRoot);

  const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

  const filteredDependencies = filterFunction(dependencies, workspacesPackageInfo);

  return filteredDependencies;
}

export async function filterDependenciesInRushFixture(fixture: string, filterFunction: any) {
  const monorepo = new Monorepo("monorepo");
  await monorepo.init(path.join(fixturesPath, fixture));
  const packageRoot = monorepo.root;

  const workspacesPackageInfo = getRushWorkspaces(packageRoot);

  const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

  const filteredDependencies = filterFunction(dependencies, workspacesPackageInfo);

  return filteredDependencies;
}
