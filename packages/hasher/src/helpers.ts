import path from "path";
import crypto from "crypto";
import findUp from "find-up";

export function hashStrings(strings: string | string[]): string {
  const hasher = crypto.createHash("sha1");

  const anArray = typeof strings === "string" ? [strings] : strings;
  const elements = [...anArray];
  elements.sort((a, b) => a.localeCompare(b));
  elements.forEach((element) => hasher.update(element));

  return hasher.digest("hex");
}

export async function getPackageRoot(cwd: string): Promise<string> {
  const packageRoot = await findUp("package.json", { cwd });

  if (!packageRoot) {
    throw new Error(`Could not find package.json inside ${cwd}.`);
  }

  return path.dirname(packageRoot);
}

export function nameAtVersion(name: string, version: string): string {
  return `${name}@${version}`;
}
