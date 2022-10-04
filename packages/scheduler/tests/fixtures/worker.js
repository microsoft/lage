// Fixture uses the `workerpool`
const { threadId } = require("worker_threads");

module.exports = function run({ target }) {
  console.log(`Thread: ${threadId}, Target: ${target.id}`);
};
