import { getMaxWorkersPerTask } from "../src/getMaxWorkersPerTask.js";

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

  it("disallows any form of strings in the maxWorkers configuration", () => {
    const testAction = () =>
      getMaxWorkersPerTask(
        {
          build: {
            options: {
              maxWorkers: "50%",
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
        9
      );

    expect(testAction).not.toThrow();

    const maxWorkersPerTask = testAction();
    expect(maxWorkersPerTask.get("build")).toBe(3);
    expect(maxWorkersPerTask.get("test")).toBe(6);
  });

  it("can divide maxWorkers for the remaining tasks", () => {
    const testAction = () =>
      getMaxWorkersPerTask(
        {
          build: {
            options: {
              maxWorkers: 3,
            },
          },

          test: {},
        },
        9
      );

    expect(testAction).not.toThrow();

    const maxWorkersPerTask = testAction();
    expect(maxWorkersPerTask.get("build")).toBe(3);

    // undefined here means the remaining workers just picked up by the AggregatePool (concurrency - maxWorkers)
    expect(maxWorkersPerTask.get("test")).toBeUndefined();
  });

  it("throws if there just aren't enough cores to handle the tasks", () => {
    const testAction = () =>
      getMaxWorkersPerTask(
        {
          build: {
            maxWorkers: 1,
          },

          test: {
            maxWorkers: 1,
          },

          lint: {
            maxWorkers: 1,
          },

          bundle: {
            maxWorkers: 1,
          },
        },
        3
      );

    expect(testAction).toThrow();
  });

  it("reserves some workers for general pool", () => {
    const maxWorkersPerTask = getMaxWorkersPerTask(
      {
        build: {},

        lint: {
          maxWorkers: 2,
        },
      },
      2
    );

    expect(maxWorkersPerTask.get("build")).toBeUndefined();
    expect(maxWorkersPerTask.get("lint")).toBe(1);
  });

  it("reserves no workers for general pool, when one task has taken over all the cores", () => {
    const maxWorkersPerTask = getMaxWorkersPerTask(
      {
        lint: {
          maxWorkers: 2,
        },
      },
      2
    );

    expect(maxWorkersPerTask.get("lint")).toBe(2);
  });
});
