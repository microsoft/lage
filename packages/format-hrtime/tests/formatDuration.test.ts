import { hrtimeDiff } from "../src/formatDuration";

describe("formatDuration", () => {
  it("should calulate diffs between two hrtime", () => {
    const start: [number, number] = [0, 0];
    const end: [number, number] = [1, 1];
    const diff = hrtimeDiff(start, end);

    expect(diff).toEqual([1, 1]);
  });

  it("should calulate diffs between two hrtime when the nsec becomes negative", () => {
    const start: [number, number] = [0, 1];
    const end: [number, number] = [1, 0];
    const diff = hrtimeDiff(start, end);

    expect(diff).toEqual([0, 999999999]);
  });
});
