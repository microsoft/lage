import yargsParser, { Arguments } from "yargs-parser";

export function arrifyArgs(args: { [key: string]: string | string[] }) {
  const argsArray: string[] = [];
  for (const [key, val] of Object.entries(args)) {
    if (key === "--" && Array.isArray(val)) {
      val.forEach((arg) => argsArray.push(arg));
    } else if (Array.isArray(val)) {
      for (const item of val) {
        pushValue(key, item);
      }
    } else {
      pushValue(key, val);
    }
  }

  return argsArray;

  function pushValue(key: string, value: string) {
    let keyArg = "";

    if (typeof value === "boolean") {
      if (key.length === 1 && value) {
        keyArg = `-${key}`;
      } else if (value) {
        keyArg = `--${key}`;
      } else {
        keyArg = `--no-${key}`;
      }

      argsArray.push(keyArg);
    } else {
      if (key.length === 1 && value) {
        keyArg = `-${key}`;
      } else if (value) {
        keyArg = `--${key}`;
      }

      argsArray.push(keyArg, value);
    }
  }
}

export function getPassThroughArgs(command: string[], args: { [key: string]: string | string[] }) {
  let result: string[] = [];

  let lageArgs = [
    "node",
    "scope",
    "since",
    "cache",
    "deps",
    "resetCache",
    "ignore",
    "verbose",
    "only",
    "concurrency",
    "profile",
    "grouped",
    "reporter",
    "to",
    "parallel",
    "continue",
    "safeExit",
    "includeDependencies",
    "logLevel",
    "cacheKey",
    "dist",
    "experimentDist",
    "skipLocalCache",
    "_",
  ];

  if (command[0] === "cache") {
    lageArgs = [...lageArgs, "clear", "prune"];
  }

  const filtered: { [key: string]: string | string[] } = {};

  for (const [key, value] of Object.entries(args)) {
    if (!lageArgs.includes(key)) {
      filtered[key] = value;
    }
  }

  result = result.concat(arrifyArgs(filtered));

  return result;
}

export function parseArgs() {
  return yargsParser(process.argv.slice(2), {
    array: ["scope", "node", "ignore", "to", "reporter"],
    configuration: {
      "populate--": true,
      "strip-dashed": true,
    },
    string: ["cacheKey"],
  });
}

export function validateInput(parsedArgs: Arguments) {
  return parsedArgs._ && parsedArgs._.length > 0;
}
