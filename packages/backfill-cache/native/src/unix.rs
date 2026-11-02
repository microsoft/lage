use std::{
    fs, io,
    os::{raw::c_long, unix::fs::MetadataExt},
    path::Path,
};

use crate::FileMetadata;

pub(super) fn file_metadata(path: &Path) -> io::Result<Option<FileMetadata>> {
    let metadata = fs::symlink_metadata(path)?;
    if !metadata.is_file() {
        return Ok(None);
    }
    Ok(Some(FileMetadata {
        dev: metadata.dev(),
        ino: metadata.ino(),
        mode: metadata.mode(),
        size: metadata.size(),
        // libuv's uv_timespec_t uses C long, including on 32-bit Unix hosts.
        mtime_ns: i128::from(metadata.mtime() as c_long) * 1_000_000_000
            + i128::from(metadata.mtime_nsec()),
        ctime_ns: i128::from(metadata.ctime() as c_long) * 1_000_000_000
            + i128::from(metadata.ctime_nsec()),
    }))
}
