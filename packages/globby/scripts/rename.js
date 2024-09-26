const fs = require("fs");
const path = require("path");

fs.renameSync(path.join(__dirname, "../lib/index.d.mts"), path.join(__dirname, "../lib/index.d.ts"));