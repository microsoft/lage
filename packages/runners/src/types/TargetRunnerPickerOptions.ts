/**
 * Runner record passed to the `TargetRunnerPicker`.
 *
 * Keys are runner names, to be used as `TargetConfig.type` in the lage config.
 */
export interface TargetRunnerPickerOptions {
  /** Runner name, to be used as `TargetConfig.type` in the lage config */
  [key: string]: {
    /** Path to the script file for the runner */
    script: string;
    /**
     * Options for the runner constructor.
     *
     * For the default runners, the types are:
     * - `"npmScript"`: `NpmScriptRunnerOptions`
     * - `"worker"`: `WorkerRunnerOptions`
     * - `"noop"`: n/a
     */
    options: any;
  };
}
