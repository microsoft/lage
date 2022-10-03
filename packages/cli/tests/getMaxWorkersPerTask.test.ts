// Mock "os" module to return 8 CPUs
jest.mock("os", () => {
  const os = jest.requireActual("os");
  return {
    ...os,
    cpus: jest.fn(() => [{}, {}, {}, {}, {}, {}, {}, {}]),
  };
});

import { getMaxWorkersPerTask } from "../src/config/getMaxWorkersPerTask";

describe("getMaxWorkersPerTask", () => {
  it("parses the pipeline config for maxWorkers", () => {
    const maxWorkersPerTask = getMaxWorkersPerTask({
      build: {
        options: {
          maxWorkers: "5",
        },
      },
    });

    expect(maxWorkersPerTask.get("build")).toBe(5);
  });

  it("parses for percentage", () => {
    const maxWorkersPerTask = getMaxWorkersPerTask({
      build: {
        options: {
          maxWorkers: "50%",
        },
      },
    });

    expect(maxWorkersPerTask.get("build")).toBe(4);
  });

  it("can handle if a passed-in string isn't a percentage", () => {
    const maxWorkersPerTask = getMaxWorkersPerTask({
      build: {
        options: {
          maxWorkers: "50",
        },
      },
    });

    expect(maxWorkersPerTask.get("build")).toBe(7);
  });

  it("can handle non-number-like strings", () => {
    const maxWorkersPerTask = getMaxWorkersPerTask({
      build: {
        options: {
          maxWorkers: "foo",
        },
      },
    });

    expect(maxWorkersPerTask.get("build")).toBe(7);
  });
});
