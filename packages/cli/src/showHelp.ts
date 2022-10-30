/* eslint-disable no-console */

export function showHelp(msg: string) {
  console.error(msg);

  console.log(`
Usage: lage [command] [command] [options]

command:
  init            - initializes lage and its configuration file
  cache           - operates on the cache (pass in --clear or --prune [number of days, defaults to 30])
  [command]       - any command defined in the pipeline in the lage.config.js file

options:

`);
}
