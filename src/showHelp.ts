export function showHelp(msg: string) {
  console.error(msg);

  console.log(`
Usage: lage [command] [command] [options]

command:
  init            - initializes lage and its configuration file
  [command]       - any command defined in the pipeline in the lage.config.js file

options:

`);
}
