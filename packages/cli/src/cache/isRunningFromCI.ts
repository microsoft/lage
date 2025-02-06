export const isRunningFromCI: boolean = process.env.NODE_ENV !== "test" && (!!process.env.CI || !!process.env.TF_BUILD);
