import type { Catalogs } from "../types/Catalogs.js";

/**
 * Convert catalogs to the yaml format used by yarn v4 and pnpm.
 */
export function catalogsToYaml(
  catalogs: Catalogs,
  options: {
    /** Number of spaces (default 2), or another indentation character */
    indent?: number | string;
  } = {}
): string {
  const { named, default: defaultCatalog } = catalogs;
  const lines: string[] = [];
  const indent = typeof options.indent === "string" ? options.indent : " ".repeat(options.indent ?? 2);

  if (defaultCatalog) {
    lines.push("catalog:");
    for (const [pkg, version] of Object.entries(defaultCatalog)) {
      lines.push(`${indent}${pkg}: ${version}`);
    }
  }

  if (named) {
    lines.push("catalogs:");
    for (const [catalogName, catalogEntries] of Object.entries(named)) {
      lines.push(`${indent}${catalogName}:`);
      for (const [pkg, version] of Object.entries(catalogEntries)) {
        lines.push(`${indent}${indent}${pkg}: ${version}`);
      }
    }
  }

  return lines.join("\n");
}
