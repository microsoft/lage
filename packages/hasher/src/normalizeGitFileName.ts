/**
 * Parses a quoted filename sourced from the output of the "git status" command.
 *
 * Paths with non-standard characters will be enclosed with double-quotes, and non-standard
 * characters will be backslash escaped (ex. double-quotes, non-ASCII characters). The
 * escaped chars can be included in one of two ways:
 * - backslash-escaped chars (ex. \")
 * - octal encoded chars (ex. \347)
 *
 * See documentation: https://git-scm.com/docs/git-status
 */
export function normalizeGitFileName(filename: string): string {
  // If there are no double-quotes around the string, then there are no escaped characters
  // to decode, so just return
  if (!filename.match(/^".+"$/)) {
    return filename;
  }

  // Need to hex encode '%' since we will be decoding the converted octal values from hex
  filename = filename.replace(/%/g, "%25");
  // Replace all instances of octal literals with percent-encoded hex (ex. '\347\275\221' -> '%E7%BD%91').
  // This is done because the octal literals represent UTF-8 bytes, and by converting them to percent-encoded
  // hex, we can use decodeURIComponent to get the Unicode chars.
  filename = filename.replace(/(?:\\(\d{1,3}))/g, (match, ...[octalValue, index, source]) => {
    // We need to make sure that the backslash is intended to escape the octal value. To do this, walk
    // backwards from the match to ensure that it's already escaped.
    const trailingBackslashes: RegExpMatchArray | null = (source as string).slice(0, index as number).match(/\\*$/);
    return trailingBackslashes && trailingBackslashes.length > 0 && trailingBackslashes[0].length % 2 === 0
      ? `%${parseInt(octalValue, 8).toString(16)}`
      : match;
  });

  // Finally, decode the filename and unescape the escaped UTF-8 chars
  return JSON.parse(decodeURIComponent(filename));
}
