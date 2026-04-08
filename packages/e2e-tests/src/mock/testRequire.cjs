// used by outputInterop.test.ts as a sanity check

const { findPackageRoot } = require("workspace-tools");

console.log("package root", findPackageRoot(process.cwd()));
