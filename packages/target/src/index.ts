export { getPackageAndTask, getTargetId } from "./targetId";
export { Target } from './Target';

/**
 
  // commands/run.ts
  function run(config, logger) {
    // generates a pipeline - or a target graph from both a package graph and the task graph
    const packageGraph = createPackageGraph(...); // DONE: from workspace-tools
    const taskGraph = createTaskGraph(parsePipelineConfig(config.pipelines)); // TODO: from @lage-run/pipeline

    const pipeline = new Pipeline(packageGraph, taskGraph, logger);

    // during generation of the target graph, each target object is created - a runner is picked based on the target's type
    const targetGraph = pipeline.generateTargetGraph(commands, packages);

    // creates a node.js-based task scheduler from the target graph, with a set of configuration options
    // * scheduler converts the targetGraph (target nodes + target to target edges) to promise graph (map of ids -> promise function as nodes, id -> id as edges)  
    // * scheduler feeds the promise graph to p-graph
    const taskScheduler = new TaskScheduler(); // TODO: from @lage-run/scheduler

    // or

    // Lage v2.1 - creates a job for buildxl to run 
    const taskScheduler = new BuildXLScheduler(); // TODO v2.1: from @lage-run/buildxl-scheduler, e.g. from a configuration option inside `lage.config.js` (config.scheduler = new BuildXLScheduler())
    
    const runContext = await taskScheduler.start(config, targetGraph, logger);
    
    if (context.error) {
      process.exitCode = 1;
    }

    displaySummary(runContext);
  }

  // cli/index.ts
  function main() {
    const config = getConfig();
    const logger = new Logger();

    const reporters = getReportersFromConfig(config);
    logger.addReporters(reporters);

    run(config, logger);
  }

*/
