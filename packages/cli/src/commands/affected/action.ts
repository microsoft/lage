import createLogger from "@lage-run/logger";
import { getPackageInfos, getWorkspaceRoot, type PackageInfos } from "workspace-tools";
import { getConfig } from "../../config/getConfig.js";
import { getFilteredPackages } from "../../filter/getFilteredPackages.js";
import type { FilterOptions } from "../../types/FilterOptions.js";

interface AffectedOptions extends FilterOptions {
  outputFormat?: "json" | "graph" | "default";
}

export async function affectedAction(options: AffectedOptions) {
  const { dependencies, dependents, since, scope, ignore, outputFormat } = options;

  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const logger = createLogger();

  const root = getWorkspaceRoot(cwd)!;
  const packageInfos = getPackageInfos(root);

  const packages = getFilteredPackages({
    root,
    logger,
    packageInfos,
    includeDependencies: dependencies,
    includeDependents: dependents,
    since,
    scope,
    repoWideChanges: config.repoWideChanges,
    sinceIgnoreGlobs: ignore,
  });

  let output = "";
  switch (outputFormat) {
    case "graph":
      output = renderGraph({ packages, packageInfos });
      break;

    case "json":
      output = renderJson({ packages, packageInfos });
      break;

    default:
      output = renderDefault({ packages });
      break;
  }

  // eslint-disable-next-line no-console
  console.log(output);
}

function renderDefault(props: { packages: string[] }) {
  const { packages } = props;
  return `
All Affected Packages
---------------------

${packages.join("\n")}
`;
}

function renderJson(props: { packages: string[]; packageInfos: PackageInfos }) {
  const graph = generatePackageGraph(props);
  return JSON.stringify(graph);
}

function renderGraph(props: { packages: string[]; packageInfos: PackageInfos }) {
  const graph = generatePackageGraph(props);
  const { packages } = graph;

  const adjacencies: [string, string][] = [];

  for (const [pkg, info] of Object.entries(packages)) {
    for (const dep of info.dependencies) {
      adjacencies.push([pkg, dep]);
    }
  }

  return `
digraph affected {
${adjacencies.map((entry) => `  "${entry[0]}" -> "${entry[1]}"`).join("\n")}
}  
`;
}

function generatePackageGraph(props: { packages: string[]; packageInfos: PackageInfos }) {
  const { packages, packageInfos } = props;
  const packageGraph = packages.reduce<{ [pkg: string]: { dependencies: string[]; dependents: string[] } }>((accum, pkg) => {
    const dependencies = Object.keys(packageInfos[pkg].dependencies ?? {}).filter((dep) => packages.includes(dep));
    const dependents = Object.keys(packageInfos[pkg].dependents ?? {}).filter((dep) => packages.includes(dep));

    accum[pkg] = {
      dependencies,
      dependents,
    };

    return accum;
  }, {});

  return { packages: packageGraph, count: packages.length };
}
