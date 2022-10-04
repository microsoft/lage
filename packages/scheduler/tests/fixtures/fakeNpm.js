let sleep = parseInt(process.argv.find(arg => arg.includes('--sleep=')).trim().replace('--sleep=', '') ?? '100');
let fail = !!process.argv.find(arg => arg.includes('--fail'));

if (fail) {
  throw new Error('Fake npm failed');
}

setTimeout(() => {
  /* do NOTHING */
}, sleep);