use std::env;

/// Optional settings for glob discovery, hashing, and metadata collection.
#[napi(object)]
pub struct PartialHashGlobOptions {
  /// Base directory for relative paths and glob traversal. Defaults to the process working directory.
  pub cwd: Option<String>,
  /// Enable `.gitignore` filtering when globbing. Defaults to `true`.
  pub gitignore: Option<bool>,
  /// Requested worker count for globbing and hashing.
  /// When omitted or zero, globbing uses available CPU parallelism, capped at 12 threads;
  /// hashing uses a positive `RAYON_NUM_THREADS` integer, otherwise available CPU parallelism.
  /// Hashing uses a global Rayon pool, so this cannot resize an already initialized pool.
  pub concurrency: Option<u8>,
}

pub struct HashGlobOptions {
  pub cwd: String,
  pub gitignore: bool,
  pub concurrency: Option<usize>,
}

pub fn get_hash_glob_config(maybe_options: Option<PartialHashGlobOptions>) -> HashGlobOptions {
  let cwd = env::current_dir()
    .unwrap_or_default()
    .into_os_string()
    .into_string()
    .unwrap_or_default();

  let mut options = HashGlobOptions {
    cwd,
    gitignore: true,
    concurrency: None,
  };

  if let Some(passed_in_options) = maybe_options {
    if let Some(cwd) = passed_in_options.cwd {
      options.cwd = cwd;
    }

    if let Some(gitignore) = passed_in_options.gitignore {
      options.gitignore = gitignore;
    }

    if let Some(concurrency) = passed_in_options.concurrency {
      options.concurrency = Some(usize::from(concurrency));
    }
  }

  options
}
