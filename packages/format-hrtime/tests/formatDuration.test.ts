import { hrtimeDiff, hrToSeconds } from "../src/formatDuration";

describe("hrtimeDiff", () => {
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

describe("hrToSeconds", () => {
  it("converts a zero duration in seconds", () => {
    expect(hrToSeconds([0, 0])).toBe("0.00");
  });

  it("converts a duration of less than a minute to seconds", () => {
    expect(hrToSeconds([59, 0])).toBe("59.00");
  });

  it("converts a duration of over a minute to seconds", () => {
    expect(hrToSeconds([61, 0])).toBe("61.00");
  });

  it("converts negative durations as well", () => {
    expect(hrToSeconds([-59, 0])).toBe("-59.00");
  });

  it("rounding for nanosecs", () => {
    expect(hrToSeconds([59, 995000001])).toBe("60.00");
  });
});
