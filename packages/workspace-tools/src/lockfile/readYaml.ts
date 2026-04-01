import fs from "fs";
import type jsYamlType from "js-yaml";

export function readYaml<TReturn>(file: string): TReturn {
  // This is delay loaded to avoid the perf penalty of parsing YAML utilities any time the package
  // is used (since usage of the YAML utilities is less common).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jsYaml: typeof jsYamlType = require("js-yaml");

  const content = fs.readFileSync(file, "utf8");
  return jsYaml.load(content) as TReturn;
}
