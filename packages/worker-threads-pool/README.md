# @lage-run/worker-threads-pool

This is an `worker_threads` based threadpool implementation. We had to implement one of these because `lage` needs access to the stdin/stdout of the workers themselves for the purpose of logging and preserving them as cached outputs. This way, the workers can be long lived, but the their logs will be associated with the correct target.

It is completely based on the Node.js documentation for `async_hook`:
https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool

