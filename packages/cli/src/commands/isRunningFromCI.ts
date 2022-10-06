export const isRunningFromCI = process.env.NODE_ENV !== "test" && (!!process.env.CI || !!process.env.TF_BUILD);
