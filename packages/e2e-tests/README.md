# @lage-run/cli

This is the command line interface (CLI) for lage. It contains the logic to tie everything together:

1. parses CLI arguments via `commander`
2. initializes the various commands
3. for running the targets, there are some reserved options for lage, but the rest are passed through to the scripts
4. figures out the filtered packages as entry points (dependencies are also run, unless --no-dependents are specified)
5. scheduler, reporter, cache, logger are initialized and run
