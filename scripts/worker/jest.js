const { runCLI } = require("jest");

module.exports = async function jest(data) {
  const { target, weight } = data;
  
  console.log(`Running ${target.id}, maxWorkers: ${weight}`);

  const { results } = await runCLI({ maxWorkers: weight, rootDir: target.cwd, passWithNoTests: true, verbose: true }, [target.cwd]);

  if (results.success) {
    console.log("Tests passed");
  } else {
    throw new Error("Test failed");
  }
};
