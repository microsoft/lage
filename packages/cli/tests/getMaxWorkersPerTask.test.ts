import { getMaxWorkersPerTask } from "../src/config/getMaxWorkersPerTask";

describe("getMaxWorkersPerTask", () => {
  it("parses the pipeline config for maxWorkers", () => {
    const maxWorkersPerTask = getMaxWorkersPerTask(
      {
        build: {
          options: {
            maxWorkers: 5,
          },
        },
      },
      8
    );

    expect(maxWorkersPerTask.get("build")).toBe(5);
  });

  it("parses for percentage", () => {
    const maxWorkersPerTask = getMaxWorkersPerTask(
      {
        build: {
          options: {
            maxWorkers: "50%",
          },
        },
      },
      8
    );

    expect(maxWorkersPerTask.get("build")).toBe(4);
  });

  it("can handle if a passed-in string isn't a percentage", () => {
    const testAction = () =>
      getMaxWorkersPerTask(
        {
          build: {
            options: {
              maxWorkers: "7",
            },
          },
        },
        8
      );

    expect(testAction).toThrow();
  });

  it("can handle non-number-like strings", () => {
    const testAction = () =>
      getMaxWorkersPerTask(
        {
          build: {
            options: {
              maxWorkers: "foo",
            },
          },
        },
        8
      );

    expect(testAction).toThrow();
  });

  it("can handle sum of maxWorkers that exceed concurrency", () => {
    const testAction = () =>
      getMaxWorkersPerTask(
        {
          build: {
            options: {
              maxWorkers: 10,
            },
          },

          test: {
            maxWorkers: 20,
          },
        },
        8
      );

    expect(testAction).toThrow();
  });
});
