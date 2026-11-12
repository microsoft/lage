use std::env;

#[napi(object)]
pub struct PartialHashGlobOptions {
  pub cwd: Option<String>,
  pub gitignore: Option<bool>,
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
