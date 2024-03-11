# @lage-run/daemon

This package contains code to be run inside a daemon. The service should monitors for changes in the filesystem using a rust-based watcher and update the graph information. It will also precalculate hashes of files to help speed up that look up as well.
