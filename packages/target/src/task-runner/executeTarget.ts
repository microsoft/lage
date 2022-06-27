import { TargetDefinition } from "../TargetDefinition";

async function run(target: Target) {
  // select executor strategy base on target type
  const executor = new CommandRunner(target);

  // run target
  const startTime = process.hrtime();
  let duration: [number, number] = [0, 0];

  if (shouldSkip?.call(target, target)) {
    duration = process.hrtime(startTime);
    return;
  }

  await target.onStart?.call(target, target);
  try {
    await target.run(target);
    await target.onComplete?.call(target, target);
  } catch (err) {
    await target.onFail?.call(target, target, err);
    throw err;
  } finally {
    duration = process.hrtime(startTime);
  }

  return { startTime, duration };
}
