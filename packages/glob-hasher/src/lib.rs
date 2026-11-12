#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

mod config;
mod glob;
mod hasher;

pub mod glob_hasher {
  use dashmap::DashMap;
  use napi::bindgen_prelude::BigInt;

  use crate::config::{get_hash_glob_config, PartialHashGlobOptions};
  use crate::glob::glob as glob_fn;
  use crate::hasher;
  use rayon::prelude::*;
  use std::collections::HashMap;
  use std::fs;
  use std::path::{Path, PathBuf};
  use std::time::SystemTime;

  #[napi]
  pub fn hash_glob_xxhash(
    globs: Vec<String>,
    maybe_options: Option<PartialHashGlobOptions>,
  ) -> Option<HashMap<String, Option<u64>>> {
    let options = get_hash_glob_config(maybe_options);

    if let Some(concurrency) = options.concurrency {
      rayon::ThreadPoolBuilder::new()
        .num_threads(concurrency)
        .build_global()
        .unwrap_or_default();
    }

    match glob_fn(globs, &options) {
      Some(file_set) => hasher::xxhash(file_set, options.cwd.as_str()),
      None => None,
    }
  }

  #[napi]
  pub fn hash_glob_git(
    globs: Vec<String>,
    maybe_options: Option<PartialHashGlobOptions>,
  ) -> Option<HashMap<String, Option<String>>> {
    let options = get_hash_glob_config(maybe_options);

    if let Some(concurrency) = options.concurrency {
      rayon::ThreadPoolBuilder::new()
        .num_threads(concurrency)
        .build_global()
        .unwrap_or_default();
    }

    match glob_fn(globs, &options) {
      Some(file_set) => hasher::git_hash(file_set, options.cwd.as_str()),
      None => None,
    }
  }

  #[napi]
  pub fn hash(
    files: Vec<String>,
    maybe_options: Option<PartialHashGlobOptions>,
  ) -> Option<HashMap<String, Option<String>>> {
    let options = get_hash_glob_config(maybe_options);

    if let Some(concurrency) = options.concurrency {
      rayon::ThreadPoolBuilder::new()
        .num_threads(concurrency)
        .build_global()
        .unwrap_or_default();
    }

    // handle relative paths as inputs
    let file_set: Vec<PathBuf> = files
      .iter()
      .map(|f| {
        let file_path = Path::new(&f);
        if file_path.is_relative() {
          return Path::join(Path::new(&options.cwd), file_path).to_path_buf();
        }

        file_path.to_path_buf()
      })
      .collect();

    hasher::git_hash_vec(file_set, options.cwd.as_str())
  }

  #[napi]
  pub fn glob(
    globs: Vec<String>,
    maybe_options: Option<PartialHashGlobOptions>,
  ) -> Option<Vec<String>> {
    let options = get_hash_glob_config(maybe_options);
    glob_fn(globs, &options).map(|file_set| {
      file_set
        .into_iter()
        .map(|path_buf| path_buf.into_os_string().to_string_lossy().to_string())
        .collect()
    })
  }

  #[napi(object)]
  pub struct StatEntry {
    pub mtime: BigInt,
    pub size: i64,
  }

  #[napi]
  pub fn stat(
    files: Vec<String>,
    maybe_options: Option<PartialHashGlobOptions>,
  ) -> Option<HashMap<String, StatEntry>> {
    let options = get_hash_glob_config(maybe_options);

    // handle relative paths as inputs
    let file_set: Vec<PathBuf> = files
      .iter()
      .map(|f| {
        let file_path = Path::new(&f);
        if file_path.is_relative() {
          return Path::join(Path::new(&options.cwd), file_path).to_path_buf();
        }

        file_path.to_path_buf()
      })
      .collect();

    let stat_map: DashMap<String, StatEntry> = DashMap::new();

    file_set.par_iter().for_each(|path| {
      if let Ok(metadata) = fs::metadata(path) {
        let modified_time = metadata.modified().unwrap();
        let mtime = modified_time
          .duration_since(SystemTime::UNIX_EPOCH)
          .unwrap()
          .as_millis();
        let len = metadata.len();
        let stat = StatEntry {
          mtime: mtime.into(),
          size: len as i64,
        };

        stat_map.insert(
          path
            .strip_prefix(&options.cwd)
            .unwrap()
            .to_string_lossy()
            .to_string()
            .replace("\\", "/"),
          stat,
        );
      }
    });

    Some(stat_map.into_iter().collect::<HashMap<String, StatEntry>>())
  }
}
