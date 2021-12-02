// @ts-check
/** @type {import('beachball').BeachballConfig}*/
module.exports = {
  ignorePatterns: [
    '.*ignore',
    '.github/**',
    'beachball.config.js',
    'decks/**',
    'docs/**',
    'jasmine.json',
    'jest.config.js',
    'renovate.json',
    'tests/**',
    // This one is especially important (otherwise dependabot would be blocked by change file requirements)
    'yarn.lock',
  ],
};
