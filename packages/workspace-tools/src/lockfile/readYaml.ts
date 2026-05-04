import fs from "fs";
import type jsYamlType from "js-yaml";

/**
 * Parse YAML content from a string. Delay-loads `js-yaml` to avoid perf penalty.
 */
export function parseYaml<TReturn>(content: string): TReturn {
  // This is delay loaded to avoid the perf penalty of parsing YAML utilities any time the package
  // is used (since usage of the YAML utilities is less common).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jsYaml: typeof jsYamlType = require("js-yaml");

  return jsYaml.load(content) as TReturn;
}

/**
 * Read a YAML file from disk and parse its contents. Delay-loads `js-yaml` to avoid perf penalty.
 */
export function readYaml<TReturn>(file: string): TReturn {
  const content = fs.readFileSync(file, "utf8");
  return parseYaml<TReturn>(content);
}
