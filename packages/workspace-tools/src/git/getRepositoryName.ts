import gitUrlParse from "git-url-parse";

/**
 * Get a repository full name (owner and repo, plus organization for ADO/VSO) from a repository URL,
 * including special handling for the many ADO/VSO URL formats.
 *
 * Examples:
 * - returns `microsoft/lage` for `https://github.com/microsoft/lage.git`
 * - returns `foo/bar/some-repo` for `https://dev.azure.com/foo/bar/_git/some-repo`
 */
export function getRepositoryName(url: string): string {
  try {
    // Mostly use this standard library, but fix some VSO/ADO-specific quirks to account for the
    // fact that all of the following URLs should be considered to point to the same repo:
    // https://foo.visualstudio.com/bar/_git/some-repo
    // https://foo.visualstudio.com/DefaultCollection/bar/_git/some-repo
    // https://user:token@foo.visualstudio.com/DefaultCollection/bar/_git/some-repo
    // https://foo.visualstudio.com/DefaultCollection/bar/_git/_optimized/some-repo
    // foo@vs-ssh.visualstudio.com:v3/foo/bar/some-repo
    // https://dev.azure.com/foo/bar/_git/some-repo
    // https://dev.azure.com/foo/bar/_git/_optimized/some-repo
    // https://user@dev.azure.com/foo/bar/_git/some-repo
    // git@ssh.dev.azure.com:v3/foo/bar/some-repo
    const parsedUrl = gitUrlParse(url.replace("/_optimized/", "/").replace("/DefaultCollection/", "/"));

    // `host` is set in `parse-url` but not documented... https://github.com/IonicaBizau/parse-url/blob/c830d48647f33c054745a916cf7c4c58722f4b25/src/index.js#L28
    const host: string = (parsedUrl as any).host || "";
    const isVSO = host.endsWith(".visualstudio.com");
    if (!isVSO && host !== "dev.azure.com" && host !== "ssh.dev.azure.com") {
      return parsedUrl.full_name;
    }

    // As of writing, ADO and VSO SSH URLs are parsed completely wrong
    const sshMatch = parsedUrl.full_name.match(
      /(vs-ssh\.visualstudio\.com|ssh\.dev\.azure\.com):v\d+\/([^/]+)\/([^/]+)/
    );
    if (sshMatch) {
      return `${sshMatch[2]}/${sshMatch[3]}/${parsedUrl.name}`;
    }

    // As of writing, full_name is wrong for enough variants of ADO and VSO URLs that it
    // makes more sense to just build it manually.
    let organization: string | undefined = parsedUrl.organization;
    if (!organization && isVSO) {
      // organization is missing or wrong for VSO
      organization = host.match(/([^.@]+)\.visualstudio\.com$/)?.[1];
    }
    return `${organization}/${parsedUrl.owner}/${parsedUrl.name}`;
  } catch {
    return "";
  }
}
