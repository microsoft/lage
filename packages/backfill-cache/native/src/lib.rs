use std::{
    io,
    path::{Component, Path, PathBuf},
    sync::OnceLock,
};

use rayon::{prelude::*, ThreadPool, ThreadPoolBuilder};

// These are the platforms where the pinned napi-rs version retains the loaded image.
const MODULE_RETENTION_SUPPORTED: bool = cfg!(all(
    not(target_family = "wasm"),
    any(
        windows,
        target_vendor = "apple",
        target_os = "linux",
        target_os = "android",
        target_os = "freebsd",
        target_os = "dragonfly",
        target_os = "netbsd",
        target_os = "solaris",
        target_os = "illumos"
    )
));

#[cfg(unix)]
#[path = "unix.rs"]
mod platform;
#[cfg(windows)]
#[path = "windows.rs"]
mod platform;

#[cfg(not(any(unix, windows)))]
mod platform {
    use super::*;

    pub fn file_metadata(_: &Path) -> io::Result<Option<FileMetadata>> {
        Err(io::Error::new(
            io::ErrorKind::Unsupported,
            "Native output validation is unsupported on this platform",
        ))
    }
}

#[derive(Debug, PartialEq)]
struct FileMetadata {
    dev: u64,
    ino: u64,
    mode: u32,
    size: u64,
    mtime_ns: i128,
    ctime_ns: i128,
}

impl FileMetadata {
    fn fingerprint(&self) -> String {
        // Node transports stat fields through BigInt64Array, including unsigned file IDs.
        format!(
            "{}:{}:{}:{}:{}:{}",
            self.dev as i64,
            self.ino as i64,
            self.mode,
            self.size as i64,
            self.mtime_ns,
            self.ctime_ns
        )
    }
}

fn safe_relative_path(path: &str) -> bool {
    !path.is_empty()
        && !path.starts_with(['/', '\\'])
        && !path.contains([':', '\0'])
        && !path.split(['/', '\\']).any(|component| component == "..")
}

fn resolve_cwd(cwd: &str) -> io::Result<PathBuf> {
    if cwd.contains('\0') {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "The output directory contains a NUL character",
        ));
    }
    let absolute = std::path::absolute(if cwd.is_empty() { "." } else { cwd })?;
    let mut resolved = PathBuf::new();
    for component in absolute.components() {
        match component {
            Component::ParentDir => {
                resolved.pop();
            }
            Component::CurDir => {}
            _ => resolved.push(component),
        }
    }
    Ok(resolved)
}

fn missing(error: &io::Error) -> bool {
    if matches!(
        error.kind(),
        io::ErrorKind::NotFound | io::ErrorKind::NotADirectory
    ) {
        return true;
    }
    #[cfg(windows)]
    {
        use windows_sys::Win32::Foundation::{
            ERROR_BAD_PATHNAME, ERROR_ENVVAR_NOT_FOUND, ERROR_INVALID_DRIVE, ERROR_INVALID_NAME,
            ERROR_INVALID_REPARSE_DATA, ERROR_MOD_NOT_FOUND,
        };
        // libuv maps these Windows filename errors to ENOENT as well.
        matches!(
            error.raw_os_error().map(|code| code as u32),
            Some(
                ERROR_BAD_PATHNAME
                    | ERROR_ENVVAR_NOT_FOUND
                    | ERROR_INVALID_DRIVE
                    | ERROR_INVALID_NAME
                    | ERROR_INVALID_REPARSE_DATA
                    | ERROR_MOD_NOT_FOUND
            )
        )
    }
    #[cfg(not(windows))]
    false
}

fn validate_one(cwd: &Path, path: &str, expected: &str) -> io::Result<bool> {
    #[cfg(windows)]
    let path = path.replace('/', "\\");
    match platform::file_metadata(&cwd.join(path)) {
        Ok(Some(metadata)) => {
            Ok(metadata.ino != 0 && metadata.ctime_ns != 0 && metadata.fingerprint() == expected)
        }
        Ok(None) => Ok(false),
        Err(error) if missing(&error) => Ok(false),
        Err(error) => Err(error),
    }
}

fn worker_pool() -> io::Result<&'static ThreadPool> {
    if !MODULE_RETENTION_SUPPORTED {
        return Err(io::Error::new(
            io::ErrorKind::Unsupported,
            "This platform cannot retain a native worker pool's code image",
        ));
    }
    static POOL: OnceLock<Result<ThreadPool, rayon::ThreadPoolBuildError>> = OnceLock::new();
    POOL.get_or_init(|| {
        // The pool's threads outlive individual Node Worker environments.
        #[cfg(not(target_family = "wasm"))]
        napi::bindgen_prelude::retain_current_module_for_unload_safety();
        ThreadPoolBuilder::new()
            .num_threads(
                std::thread::available_parallelism()
                    .map_or(4, usize::from)
                    .clamp(1, 16),
            )
            .thread_name(|index| format!("lage-output-stat-{index}"))
            .build()
    })
    .as_ref()
    .map_err(|error| io::Error::other(error.to_string()))
}

fn validate_batch(cwd: &Path, paths: &[String], fingerprints: &[String]) -> io::Result<bool> {
    if !cfg!(any(unix, windows)) {
        return Err(io::Error::new(
            io::ErrorKind::Unsupported,
            "Native output validation is unsupported on this platform",
        ));
    }
    if paths.len() != fingerprints.len() || paths.iter().any(|path| !safe_relative_path(path)) {
        return Ok(false);
    }
    if paths.is_empty() {
        return Ok(true);
    }
    if !MODULE_RETENTION_SUPPORTED {
        // AIX/OpenBSD and other unsupported loaders must not get unmanaged threads.
        return validate_sequential(cwd, paths, fingerprints);
    }
    worker_pool()?.install(|| {
        paths
            .par_iter()
            .zip(fingerprints.par_iter())
            .map(|(path, expected)| validate_one(cwd, path, expected))
            // A mismatch must not hide an I/O error elsewhere in the batch.
            .try_reduce(|| true, |left, right| Ok(left && right))
    })
}

fn validate_sequential(cwd: &Path, paths: &[String], fingerprints: &[String]) -> io::Result<bool> {
    paths
        .iter()
        .zip(fingerprints)
        .try_fold(true, |matches, (path, expected)| {
            validate_one(cwd, path, expected).map(|valid| matches && valid)
        })
}

#[cfg(not(test))]
mod binding {
    use super::*;
    use napi::{bindgen_prelude::AsyncTask, Env, Error, Result, Task};
    use napi_derive::napi;

    // napi-rs exports constants under their Rust identifier.
    #[allow(non_upper_case_globals)]
    #[napi]
    pub const apiVersion: u32 = 1;

    pub struct ValidateOutputsTask {
        cwd: io::Result<PathBuf>,
        paths: Vec<String>,
        fingerprints: Vec<String>,
    }

    impl Task for ValidateOutputsTask {
        type Output = bool;
        type JsValue = bool;

        fn compute(&mut self) -> Result<bool> {
            let cwd = self
                .cwd
                .as_ref()
                .map_err(|error| Error::from_reason(error.to_string()))?;
            validate_batch(cwd, &self.paths, &self.fingerprints)
                .map_err(|error| Error::from_reason(error.to_string()))
        }

        fn resolve(&mut self, _: Env, output: bool) -> Result<bool> {
            Ok(output)
        }
    }

    #[napi(js_name = "validateOutputs")]
    pub fn validate_outputs(
        cwd: String,
        paths: Vec<String>,
        fingerprints: Vec<String>,
    ) -> AsyncTask<ValidateOutputsTask> {
        // Pin synchronously: termination may race work that has not reached compute() yet.
        #[cfg(not(target_family = "wasm"))]
        napi::bindgen_prelude::retain_current_module_for_unload_safety();
        AsyncTask::new(ValidateOutputsTask {
            // Capture the current directory before returning to JavaScript.
            cwd: resolve_cwd(&cwd),
            paths,
            fingerprints,
        })
    }
}

#[cfg(test)]
mod tests;
