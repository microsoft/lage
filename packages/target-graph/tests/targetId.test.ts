import { getPackageAndTask, getTargetId } from "../src/targetId";

describe("targetId", () => {
  it("should return a string representing an id of a target given task and package", () => {
    const targetId = getTargetId("pkg", "task");
    expect(targetId).toBe("pkg#task");
  });

  it("should split up the package name and task given an id", () => {
    const { packageName, task } = getPackageAndTask("pkg#task");
    expect(packageName).toBe("pkg");
    expect(task).toBe("task");
  });
});
