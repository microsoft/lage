const { registerWorker } = require("./registerWorker.fixture.js");

const fiveMb = (5 * 1024 * 1024) /* bytes */ / (8 /* bytes per item in empty array */);
let buffer = [];

function fn() {
  buffer = buffer.concat(new Array(fiveMb));
  return Promise.resolve(buffer);
}

registerWorker(fn);
