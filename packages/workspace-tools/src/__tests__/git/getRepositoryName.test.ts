import { describe, expect, it } from "@jest/globals";
import { getRepositoryName } from "../../git/getRepositoryName.js";

// This mostly uses gitUrlParse internally, so only test a couple basic github cases plus the
// the special cases we added to handle the annoyingly large variety of equivalent VSTS/ADO URLs
describe("getRepositoryName", () => {
  describe("github", () => {
    it("works with HTTPS URLs", () => {
      expect(getRepositoryName("https://github.com/microsoft/lage")).toBe("microsoft/lage");
    });
    it("works with HTTPS URLs with .git", () => {
      expect(getRepositoryName("https://github.com/microsoft/lage.git")).toBe("microsoft/lage");
    });
    it("works with SSH URLs", () => {
      expect(getRepositoryName("git@github.com:microsoft/lage.git")).toBe("microsoft/lage");
    });
    it("works with git:// URLs", () => {
      expect(getRepositoryName("git://github.com/microsoft/lage")).toBe("microsoft/lage");
    });
  });

  // All of these ADO and VSO variants point to the same repo
  describe("ADO", () => {
    it("works with HTTPS URLs", () => {
      expect(getRepositoryName("https://dev.azure.com/foo/bar/_git/some-repo")).toBe("foo/bar/some-repo");
    });
    it("works with HTTPS URLs with _optimized", () => {
      expect(getRepositoryName("https://dev.azure.com/foo/bar/_git/_optimized/some-repo")).toBe("foo/bar/some-repo");
    });
    it("works with HTTPS URLs with user", () => {
      expect(getRepositoryName("https://user@dev.azure.com/foo/bar/_git/some-repo")).toBe("foo/bar/some-repo");
    });
    it("works with HTTPS URLs with user and token", () => {
      expect(getRepositoryName("https://user:fakePAT@dev.azure.com/foo/bar/_git/some-repo")).toBe("foo/bar/some-repo");
    });
    it("works SSH URLs", () => {
      expect(getRepositoryName("git@ssh.dev.azure.com:v3/foo/bar/some-repo")).toBe("foo/bar/some-repo");
    });
  });

  describe("VSO", () => {
    it("works with HTTPS URLs", () => {
      expect(getRepositoryName("https://foo.visualstudio.com/bar/_git/some-repo")).toBe("foo/bar/some-repo");
    });
    it("works with HTTPS URLs with DefaultCollection", () => {
      expect(getRepositoryName("https://foo.visualstudio.com/DefaultCollection/bar/_git/some-repo")).toBe(
        "foo/bar/some-repo"
      );
    });
    it("works with HTTPS URLs with _optimized", () => {
      expect(getRepositoryName("https://foo.visualstudio.com/DefaultCollection/bar/_git/_optimized/some-repo")).toBe(
        "foo/bar/some-repo"
      );
    });
    it("works with HTTPS URLs with user", () => {
      expect(getRepositoryName("https://user@foo.visualstudio.com/bar/_git/some-repo")).toBe("foo/bar/some-repo");
    });
    it("works with HTTPS URLs with user and token", () => {
      expect(getRepositoryName("https://user:fakePAT@foo.visualstudio.com/bar/_git/some-repo")).toBe(
        "foo/bar/some-repo"
      );
    });
    it("works with SSH URLs", () => {
      expect(getRepositoryName("foo@vs-ssh.visualstudio.com:v3/foo/bar/some-repo")).toBe("foo/bar/some-repo");
    });
  });
});
