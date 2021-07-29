import { PipelineDefinition } from "../types/PipelineDefinition";

// const DELIMITER = "#";

// interface PipelineConfig {
//   taskDeps: {
//     [taskName: string]: {
//       deps: string[];
//       topoDeps: string[];
//     };
//   };
//   packageTaskDeps: [string, string][];
// }

export function parsePipelineConfig(pipeline: PipelineDefinition) {
  // const pipelineConfig: PipelineConfig = {
  //   taskDeps: {},
  //   packageTaskDeps: [],
  // };
  // for (const [taskName, taskDeps] of Object.entries(pipeline)) {
  //   if (taskName.includes(DELIMITER)) {
  //     const to = taskName;

  //     for (const from of taskDeps) {
  //       if (!from.includes(DELIMITER)) {
  //         throw new Error(
  //           "Pipeline config error: single package task dependencies must be other individual package tasks, currently"
  //         );
  //       }

  //       if (from && to) {
  //         pipelineConfig.packageTaskDeps.push([from, to]);
  //       }
  //     }
  //   } else {
  //     const deps = taskDeps.filter((dep) => !dep.startsWith("^"));
  //     const topoDeps = taskDeps
  //       .filter((dep) => dep.startsWith("^"))
  //       .map((dep) => dep.slice(1));

  //     pipelineConfig.taskDeps[taskName] = {
  //       deps,
  //       topoDeps,
  //     };
  //   }
  // }

  // return pipelineConfig;
}
