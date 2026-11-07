// used by outputInterop.test.ts to verify that the CJS output from this package can be imported by Node's ESM loader

import { findPackageRoot } from "workspace-tools";

console.log("package root", findPackageRoot(process.cwd()));
