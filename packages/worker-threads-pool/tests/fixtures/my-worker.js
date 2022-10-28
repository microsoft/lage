const { registerWorker } = require("./registerWorker.fixture.js");

function fn() {
  return Promise.resolve();
}

registerWorker(fn);