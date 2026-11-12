use dashmap::{DashMap, DashSet};
use gix::features::hash::hasher;
use gix::objs::encode::loose_header;
use rayon::prelude::*;

use std::fs;
use std::path::{Path, PathBuf};
use std::{collections::HashMap, sync::Arc};
use xxhash_rust::xxh3;

pub fn xxhash(file_set: DashSet<PathBuf>, cwd: &str) -> Option<HashMap<String, Option<u64>>> {
  let cwd: String = cwd.into();
  let hashes = Arc::new(DashMap::<String, Option<u64>>::new());

  file_set.into_par_iter().for_each(|file_path| {
    let map = hashes.clone();
    let base_cwd = cwd.clone();

    let bytes_results = read_file(file_path.as_path());
    let key = normalize_path(&base_cwd, file_path);

    if let Ok(bytes) = bytes_results {
      map.insert(key, Some(xxh3::xxh3_64(&bytes)));
    } else {
      map.insert(key, None);
    }
  });

  if let Ok(map) = Arc::try_unwrap(hashes) {
    return Some(map.into_iter().collect::<HashMap<String, Option<u64>>>());
  }

  None
}

pub fn git_hash(file_set: DashSet<PathBuf>, cwd: &str) -> Option<HashMap<String, Option<String>>> {
  let cwd: String = cwd.into();
  let hashes = Arc::new(DashMap::<String, Option<String>>::new());

  file_set.into_par_iter().for_each(|file_path| {
    let map = hashes.clone();
    let base_cwd = cwd.clone();

    let bytes_results = read_file(file_path.as_path());
    let key = normalize_path(&base_cwd, file_path);

    if let Ok(bytes) = bytes_results {
      let mut hasher = hasher(gix::hash::Kind::Sha1);
      hasher.update(&loose_header(gix::objs::Kind::Blob, bytes.len() as u64));
      hasher.update(&bytes);

      map.insert(key, Some(hex::encode(hasher.digest())));
    } else {
      map.insert(key, None);
    }
  });

  if let Ok(map) = Arc::try_unwrap(hashes) {
    return Some(map.into_iter().collect::<HashMap<String, Option<String>>>());
  }

  None
}

pub fn git_hash_vec(files: Vec<PathBuf>, cwd: &str) -> Option<HashMap<String, Option<String>>> {
  let cwd: String = cwd.into();
  let hashes = Arc::new(DashMap::<String, Option<String>>::new());

  files.into_par_iter().for_each(|file_path| {
    let map = hashes.clone();
    let base_cwd = cwd.clone();

    let bytes_results = read_file(file_path.as_path());
    let key = normalize_path(&base_cwd, file_path);

    if let Ok(bytes) = bytes_results {
      let mut hasher = hasher(gix::hash::Kind::Sha1);
      hasher.update(&loose_header(gix::objs::Kind::Blob, bytes.len() as u64));
      hasher.update(&bytes);

      map.insert(key, Some(hex::encode(hasher.digest())));
    } else {
      map.insert(key, None);
    }
  });

  if let Ok(map) = Arc::try_unwrap(hashes) {
    return Some(map.into_iter().collect::<HashMap<String, Option<String>>>());
  }

  None
}

fn normalize_path(base_cwd: &str, file_path: PathBuf) -> String {
  file_path
    .strip_prefix(base_cwd)
    .unwrap()
    .to_string_lossy()
    .to_string()
    .replace("\\", "/")
}

fn read_file(path: &Path) -> Result<Vec<u8>, anyhow::Error> {
  let read_bytes = fs::read(path);

  let mut result = Vec::new();
  let mut prev_byte: Option<u8> = None;

  if let Ok(ref bytes) = read_bytes {
    if is_binary(bytes) {
      return Ok(bytes.clone());
    }
  }

  if let Ok(ref bytes) = read_bytes {
    for byte in bytes.clone() {
      match (prev_byte, byte) {
        (Some(b'\r'), b'\n') => {}
        (None, _) => {}
        (Some(ref b), _) => {
          // Not a CRLF, add previous byte to output vector
          result.push(*b);
        }
      }

      prev_byte = Some(byte);
    }

    // Add last byte to output vector if it was not a CR
    if let Some(byte) = prev_byte {
      if byte != b'\r' {
        result.push(byte);
      }
    }
  } else {
    return Err(anyhow::anyhow!("Failed to read file"));
  }

  Ok(result)
}

// Same rule as git in detecting whether or not the file is binary
fn is_binary(bytes: &[u8]) -> bool {
  let first_few_bytes = bytes.iter().take(8000);
  for byte in first_few_bytes {
    if byte == &b'\0' {
      return true;
    }
  }

  false
}
