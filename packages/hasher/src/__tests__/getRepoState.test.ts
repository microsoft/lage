import { parseGitVersion } from "../ensureGitMinimumVersion";

describe(parseGitVersion.name, () => {
  it("Can parse valid git version responses", () => {
    expect(parseGitVersion("git version 2.30.2.windows.1")).toEqual({
      major: 2,
      minor: 30,
      patch: 2,
    });
    expect(parseGitVersion("git version 2.30.2.windows.1.g8b8f8e")).toEqual({
      major: 2,
      minor: 30,
      patch: 2,
    });
    expect(parseGitVersion("git version 2.30.2")).toEqual({
      major: 2,
      minor: 30,
      patch: 2,
    });
  });

  it("Rejects invalid git version responses", () => {
    expect(() => parseGitVersion("2.22.0.windows.1")).toThrowErrorMatchingInlineSnapshot(
      `"While validating the Git installation, the "git version" command produced unexpected output: "2.22.0.windows.1""`
    );
    expect(() => parseGitVersion("git version 2.30.A")).toThrowErrorMatchingInlineSnapshot(
      `"While validating the Git installation, the "git version" command produced unexpected output: "git version 2.30.A""`
    );
    expect(() => parseGitVersion("git version 2.30")).toThrowErrorMatchingInlineSnapshot(
      `"While validating the Git installation, the "git version" command produced unexpected output: "git version 2.30""`
    );
    expect(() => parseGitVersion("git version .2.30")).toThrowErrorMatchingInlineSnapshot(
      `"While validating the Git installation, the "git version" command produced unexpected output: "git version .2.30""`
    );
  });
});
