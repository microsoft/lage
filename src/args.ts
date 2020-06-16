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

export function getPassThroughArgs(args: { [key: string]: string | string[] }) {
  let result: string[] = [];

  let {
    node: _nodeValues,
    scope: _scopeArg,
    since: _sinceArg,
    deps: _depsArg,
    cache: _cacheArg,
    resetCache: _resetCacheArg,
    ignore: _ignoreArg,
    verbose: _verboseArg,
    _: _positionals,
    ...filtered
  } = args;

  result = result.concat(arrifyArgs(filtered));

  return result;
}

export function parseArgs() {
  return yargsParser(process.argv.slice(2), {
    array: ["scope", "node", "ignore"],
    configuration: {
      "populate--": true,
      "strip-dashed": true,
    },
  });
}

export function validateInput(parsedArgs: Arguments) {
  if (parsedArgs._.length < 1) {
    console.log("Usage: lage [command]");
    process.exit(0);
  }
}
