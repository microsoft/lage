import { getPackageAndTask, getTargetId } from "../src/targetId.js";

describe("getTargetId", () => {
  it("should return a string representing an id of a target given task and package", () => {
    const targetId = getTargetId("pkg", "task");
    expect(targetId).toBe("pkg#task");
  });

  it("should be able to generate target id for tasks at the root", () => {
    const targetId = getTargetId(undefined, "task");
    expect(targetId).toBe("#task");
  });
});

describe("getPackageAndTask", () => {
  it("should split up the package name and task given an id", () => {
    const { packageName, task } = getPackageAndTask("pkg#task");
    expect(packageName).toBe("pkg");
    expect(task).toBe("task");
  });

  it("should be able to parse a id with no package", () => {
    const { packageName, task } = getPackageAndTask("#task");
    expect(packageName).toBeUndefined();
    expect(task).toBe("task");
  });

  it("should be able to parse a id with // as the package", () => {
    const { packageName, task } = getPackageAndTask("//#task");
    expect(packageName).toBeUndefined();
    expect(task).toBe("task");
  });
});
