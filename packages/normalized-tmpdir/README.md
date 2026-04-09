# normalized-tmpdir

Normalize the value returned from `os.tmpdir()` to eliminate OS-specific symlinks and naming variations. This is mainly useful in tests that rely on path comparisons.

## Currently-handled issues

### Mac

`os.tmpdir()` may return `/var/...` which is a symlink to `/private/var/...`. This can be fixed with `fs.realpathSync()`.

### Windows

On Windows, [`os.tmpdir()`](https://github.com/nodejs/node/blob/762a3a8ad925d56a12b43e0e7f7c811e93097784/lib/os.js#L183) uses the value of the `TEMP` or `TMP` environment variables. In some cases (including on GitHub Actions runners), if the user directory name is more than 8 characters, these variables _may_ include a [short (8.3) name](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#short-vs-long-names) for the user directory.

Node doesn't have an API to convert between short and long names. There are [various possible workarounds](https://stackoverflow.com/questions/34473934/how-can-i-convert-a-windows-short-name-path-into-long-names-within-a-batch-scrip), including:

- Use powershell: this is an official API but much more expensive.
- There's no `cmd` built-in or one-liner for this. However, [`attrib.exe`](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/attrib) appears to always expand the last path segment into a long path.
- If the only short segment is the user directory name, replace it with the path from `os.homedir()` (as long as it's the same directory and not a short name).

This package currently tries the `os.homedir()` workaround first (since it doesn't require spawning a process), and tries iterating through path segments and calling `attrib.exe` as a fallback.

## API

### `normalizedTmpdir(options?): string`

Return a normalized version of `os.tmpdir()`.

```js
import { normalizedTmpdir } from "normalized-tmpdir";

const tmpdir = normalizedTmpdir();
```

The function accepts an options object:

- `console?: boolean | { warn: typeof console['warn'] }`: By default, the library does not log warnings if normalization fails. If this option is true, log warnings to the default console. If a console object is provided, use it for logging.

To avoid potentially doing the Windows normalization on every call, the calculated full path is cached.

#### Example: Using with Jest console mocks

If you have Jest tests that mock the console methods, but you want errors from `normalizedTmpdir` to display anyway (for easier debugging), you can do the following:

```js
import { normalizedTmpdir } from "normalized-tmpdir";
import realConsole from "console";

const tmpdir = normalizedTmpdir({ console: realConsole });
```

### `expandShortPath(shortPath: string): string | false`

**On Windows only**: expand an _absolute_ path with short (8.3) segments to a long path. If the user name is the only short segment, and `shortPath` is under `os.homedir()` (which must not include any short segments), uses `os.homedir()` as a replacement for the short part. Otherwise, expands each short segment of the path using `attrib.exe`.

Returns the expanded path, or false if not on Windows, it's an unsupported type of path, or there's an error expanding any of the segments.

```js
import os from "os";
import { expandShortPath } from "normalized-tmpdir";

if (os.platform() === "win32") {
  // Example: expand a short path to C:\Users\VeryLongName
  const longPath = expandShortPath("C:\\Users\\VERYLO~1");
}
```
