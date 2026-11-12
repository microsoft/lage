use std::{path::PathBuf, sync::Arc};

use dashmap::DashSet;
use ignore::{overrides::OverrideBuilder, WalkBuilder};

use crate::config::HashGlobOptions;

pub fn glob(globs: Vec<String>, options: &HashGlobOptions) -> Option<DashSet<PathBuf>> {
  let HashGlobOptions {
    cwd,
    gitignore,
    concurrency,
  } = options;

  let mut override_builder = OverrideBuilder::new(cwd.clone());

  for glob in globs {
    override_builder.add(&glob).unwrap();
  }

  override_builder.add("!.git/**").unwrap();

  if let Ok(overrides) = override_builder.build() {
    let files = Arc::new(DashSet::new());

    let mut builder = WalkBuilder::new(cwd);

    builder
      .overrides(overrides)
      .git_ignore(*gitignore)
      .hidden(false);

    if let Some(concurrency) = concurrency {
      builder.threads(*concurrency);
    }

    builder.build_parallel().run(|| {
      let files_set = files.clone();

      Box::new(move |dir_entry_result| {
        use ignore::WalkState::*;

        if let Ok(dir_entry) = dir_entry_result {
          if dir_entry.path().is_file() {
            files_set.insert(dir_entry.into_path());
          }
        }

        Continue
      })
    });

    if let Ok(file_set) = Arc::try_unwrap(files) {
      return Some(file_set);
    }
  }

  None
}
