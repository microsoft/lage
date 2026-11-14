module.exports.isCI = () => !!(process.env.CI || process.env.TF_BUILD);

/** Get mocked process.env for both CI env vars */
module.exports.mockCIEnv = (/** @type {string} */ value) => ({ CI: value, TF_BUILD: value });
