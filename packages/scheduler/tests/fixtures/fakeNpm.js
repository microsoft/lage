const sleep = parseInt(
  process.argv
    .find((arg) => arg.includes("--sleep="))
    ?.trim()
    .replace("--sleep=", "") ?? "100"
);
const fail = process.argv.some((arg) => arg.includes("--fail"));

if (fail) {
  throw new Error("Fake npm failed");
}

setTimeout(() => {
  /* do NOTHING */
}, sleep);

module.exports = {}; // remove from global scope
