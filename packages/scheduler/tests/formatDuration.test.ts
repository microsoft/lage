import { hrToSeconds } from "../src/formatDuration";

describe("formatDuration", () => {
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
