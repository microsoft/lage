import path from 'path';
import fs from 'fs';

/**
 * Starting from `cwd`, searches up the directory hierarchy for `pathName`
 * @param pathName
 * @param cwd
 */
export function searchUp(pathName: string, cwd: string) {
  const root = path.parse(cwd).root;

  let found = false;

  while (!found && cwd !== root) {
    if (fs.existsSync(path.join(cwd, pathName))) {
      found = true;
      break;
    }

    cwd = path.dirname(cwd);
  }

  if (found) {
    return cwd;
  }

  return null;
}

export function findGitRoot(cwd: string) {
  return searchUp('.git', cwd);
}

export function findPackageRoot(cwd: string) {
  return searchUp('package.json', cwd);
}

export function getChangePath(cwd: string) {
  const gitRoot = findGitRoot(cwd);

  if (gitRoot) {
    return path.join(gitRoot, 'change');
  }

  return null;
}

export function isChildOf(child: string, parent: string) {
  const relativePath = path.relative(child, parent);
  return /^[.\/\\]+$/.test(relativePath);
}
