const { registerWorker } = require("./registerWorker.fixture.js");

function fn() {
  return Promise.reject();
}

registerWorker(fn);