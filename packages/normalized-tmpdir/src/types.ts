export interface NormalizedTmpdirOptions {
  /**
   * By default, the library does not log warnings if normalization fails. If this option is true,
   * log warnings to the default console. If a console object is provided, use it for logging
   * (useful if you're mocking the console in Jest but always want this error to be shown).
   */
  console?: boolean | Pick<typeof console, "warn">;
}
