// Fixture uses the `workerpool`
const workerpool = require("workerpool");

function run(target, abortSignal) {
  console.log("HELLO WORLD" + target.id + abortSignal);
}

workerpool.worker({
  run,
});
