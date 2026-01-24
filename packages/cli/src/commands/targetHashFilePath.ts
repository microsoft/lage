import path from "path";

export function getHashFilePath(target: { task: string }): string {
  return path.join(`node_modules/.lage/hash_${target.task}`);
}

export function getGlobalInputHashFilePath(target: { task: string }): string {
  return path.join(`node_modules/.lage/global_inputs_hash_${target.task}`);
}
