use std::{
    fs,
    process::Command,
    sync::atomic::{AtomicUsize, Ordering},
    time::{Duration, SystemTime},
};

use super::*;

struct Fixture(PathBuf);

impl Fixture {
    fn new() -> Self {
        static NEXT_ID: AtomicUsize = AtomicUsize::new(0);
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("test-fixtures")
            .join(format!(
                "{}-{}",
                std::process::id(),
                NEXT_ID.fetch_add(1, Ordering::Relaxed)
            ));
        fs::create_dir_all(&path).unwrap();
        Self(path)
    }

    fn write(&self, path: &str, content: &[u8]) -> PathBuf {
        let path = self.0.join(path);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, content).unwrap();
        path
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).unwrap();
    }
}

fn node_fingerprint(path: &Path) -> String {
    let output = Command::new("node")
        .args([
            "-e",
            "const s=require('node:fs').lstatSync(process.argv[1],{bigint:true});\
             process.stdout.write([s.dev,s.ino,s.mode,s.size,s.mtimeNs,s.ctimeNs].join(':'));",
        ])
        .arg(path)
        .output()
        .expect("Node.js is required for metadata parity tests");
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout).unwrap()
}

fn assert_node_parity(path: &Path) -> String {
    let expected = node_fingerprint(path);
    assert_eq!(
        platform::file_metadata(path)
            .unwrap()
            .unwrap()
            .fingerprint(),
        expected
    );
    #[cfg(windows)]
    assert_eq!(
        platform::file_metadata_by_handle(path)
            .unwrap()
            .unwrap()
            .fingerprint(),
        expected
    );
    expected
}

#[test]
fn fingerprint_preserves_nodes_signed_64_bit_fields() {
    let metadata = FileMetadata {
        dev: u64::MAX,
        ino: 1 << 63,
        mode: 0o100666,
        size: u64::MAX,
        mtime_ns: -100,
        ctime_ns: 100,
    };
    assert_eq!(
        metadata.fingerprint(),
        "-1:-9223372036854775808:33206:-1:-100:100"
    );
}

#[test]
fn relative_paths_and_canonical_fingerprints() {
    for path in [
        "",
        "/output",
        "\\output",
        "../output",
        "a/../b",
        "a\\..\\b",
        "a/..",
        "..",
        "C:output",
        "a:b",
        "a\0b",
        "\\\\server\\share\\file",
    ] {
        assert!(!safe_relative_path(path), "{path:?}");
    }
    for path in ["output", "a/b", "a\\b", "./output", "a//b", "...", "é/😀"] {
        assert!(safe_relative_path(path), "{path:?}");
    }
    let fixture = Fixture::new();
    let file = fixture.write("output", b"test");
    let fingerprint = assert_node_parity(&file);
    assert!(validate_batch(
        &fixture.0,
        &["output".into()],
        std::slice::from_ref(&fingerprint)
    )
    .unwrap());
    assert!(validate_sequential(
        &fixture.0,
        &["output".into()],
        std::slice::from_ref(&fingerprint)
    )
    .unwrap());
    for fingerprint in [
        format!("0{fingerprint}"),
        format!("{fingerprint}:"),
        fingerprint.replace(':', ","),
        String::new(),
    ] {
        assert!(!validate_sequential(
            &fixture.0,
            &["output".into()],
            std::slice::from_ref(&fingerprint)
        )
        .unwrap());
        assert!(!validate_batch(&fixture.0, &["output".into()], &[fingerprint]).unwrap());
    }
    assert!(!validate_batch(&fixture.0, &["output".into()], &[]).unwrap());
    assert!(validate_batch(&fixture.0, &[], &[]).unwrap());
    assert_eq!(resolve_cwd("").unwrap(), std::env::current_dir().unwrap());
    assert_eq!(
        resolve_cwd(fixture.0.join("ignored").join("..").to_str().unwrap()).unwrap(),
        fixture.0
    );
}

#[test]
fn metadata_matches_node_for_unicode_readonly_and_long_paths() {
    let fixture = Fixture::new();
    let file = fixture.write("unicode-漢字-😀/résumé.txt", b"content");
    assert_node_parity(&file);
    let original_permissions = fs::metadata(&file).unwrap().permissions();
    let mut permissions = original_permissions.clone();
    permissions.set_readonly(true);
    fs::set_permissions(&file, permissions.clone()).unwrap();
    let metadata = platform::file_metadata(&file).unwrap().unwrap();
    let expected = node_fingerprint(&file);
    fs::set_permissions(&file, original_permissions).unwrap();
    assert_eq!(metadata.fingerprint(), expected);

    let long = format!(
        "{}/{}/{}/output-😀.txt",
        "one".repeat(30),
        "two".repeat(30),
        "three".repeat(18)
    );
    assert_node_parity(&fixture.write(&long, b"long"));
    assert_node_parity(&fixture.write("empty", b""));
}

#[test]
fn same_length_edits_restored_mtime_and_replacements_invalidate() {
    let fixture = Fixture::new();
    let file = fixture.write("output", b"first");
    let before = assert_node_parity(&file);
    let original_mtime = fs::metadata(&file).unwrap().modified().unwrap();
    fs::write(&file, b"other").unwrap();
    fs::File::options()
        .write(true)
        .open(&file)
        .unwrap()
        .set_modified(original_mtime)
        .unwrap();
    let edited = assert_node_parity(&file);
    assert_ne!(before, edited);
    assert_eq!(before.split(':').nth(4), edited.split(':').nth(4));
    assert!(!validate_batch(&fixture.0, &["output".into()], &[before]).unwrap());

    let replacement = fixture.write("replacement", b"other");
    fs::File::options()
        .write(true)
        .open(&replacement)
        .unwrap()
        .set_modified(original_mtime)
        .unwrap();
    fs::remove_file(&file).unwrap();
    fs::rename(replacement, &file).unwrap();
    let replaced = assert_node_parity(&file);
    assert_ne!(edited.split(':').nth(1), replaced.split(':').nth(1));
    assert!(!validate_batch(&fixture.0, &["output".into()], &[edited]).unwrap());
    fs::remove_file(&file).unwrap();
    assert!(!validate_batch(&fixture.0, &["output".into()], &[replaced]).unwrap());
}

#[test]
fn missing_nonfiles_and_symlinks_do_not_validate() {
    let fixture = Fixture::new();
    let file = fixture.write("output", b"content");
    let expected = assert_node_parity(&file);
    for path in ["missing", "output/child", ".", "subdirectory"] {
        fs::create_dir_all(fixture.0.join("subdirectory")).unwrap();
        assert!(
            !validate_batch(&fixture.0, &[path.into()], std::slice::from_ref(&expected)).unwrap()
        );
    }
    #[cfg(unix)]
    std::os::unix::fs::symlink(&file, fixture.0.join("link")).unwrap();
    #[cfg(windows)]
    {
        if let Err(error) = std::os::windows::fs::symlink_file(&file, fixture.0.join("link")) {
            // Creating a symlink can require a privilege unavailable to a test account.
            if error.raw_os_error() == Some(1314) {
                eprintln!("Skipping file symlink: this account lacks symlink privileges");
                return;
            }
            panic!("{error}");
        }
    }
    assert!(!validate_batch(&fixture.0, &["link".into()], &[expected]).unwrap());
}

#[test]
fn timestamp_edge_cases_match_node() {
    let fixture = Fixture::new();
    let file = fixture.write("old", b"content");
    for time in [
        SystemTime::UNIX_EPOCH - Duration::from_secs(315_619_200),
        SystemTime::UNIX_EPOCH - Duration::new(1, 100),
        SystemTime::UNIX_EPOCH + Duration::from_secs(4_500_000_000),
    ] {
        fs::File::options()
            .write(true)
            .open(&file)
            .unwrap()
            .set_modified(time)
            .unwrap();
        assert_node_parity(&file);
    }
}

#[test]
fn batches_share_one_bounded_pool_and_do_not_hide_errors() {
    if !MODULE_RETENTION_SUPPORTED {
        assert!(worker_pool().is_err());
        return;
    }
    assert!(std::ptr::eq(worker_pool().unwrap(), worker_pool().unwrap()));
    assert!((1..=16).contains(&worker_pool().unwrap().current_num_threads()));
    assert!(missing(&io::Error::from(io::ErrorKind::NotFound)));
    assert!(missing(&io::Error::from(io::ErrorKind::NotADirectory)));
    assert!(!missing(&io::Error::from(io::ErrorKind::PermissionDenied)));
    let result: io::Result<bool> = worker_pool().unwrap().install(|| {
        [
            Ok(false),
            Err(io::Error::from(io::ErrorKind::PermissionDenied)),
        ]
        .into_par_iter()
        .try_reduce(|| true, |left, right| Ok(left && right))
    });
    assert_eq!(result.unwrap_err().kind(), io::ErrorKind::PermissionDenied);
}

#[cfg(windows)]
#[test]
fn access_denied_is_an_error_even_beside_a_missing_file() {
    let fixture = Fixture::new();
    fixture.write("denied/output", b"content");
    let denied = fixture.0.join("denied");
    let identity = Command::new("whoami.exe")
        .args(["/user", "/fo", "csv", "/nh"])
        .output()
        .unwrap();
    assert!(identity.status.success());
    let identity = String::from_utf8(identity.stdout).unwrap();
    let sid = identity
        .trim()
        .rsplit(',')
        .next()
        .unwrap()
        .trim_matches('"');
    assert!(sid.starts_with("S-1-"));
    let applied = Command::new("icacls.exe")
        .arg(&denied)
        .args(["/deny", &format!("*{sid}:(OI)(CI)(R)")])
        .output()
        .unwrap();
    assert!(applied.status.success());
    let result = validate_batch(
        &denied,
        &["missing".into(), "output".into()],
        &["mismatch".into(), "mismatch".into()],
    );
    let sequential_result = validate_sequential(
        &denied,
        &["missing".into(), "output".into()],
        &["mismatch".into(), "mismatch".into()],
    );
    let restored = Command::new("icacls.exe")
        .arg(&denied)
        .args(["/remove:d", &format!("*{sid}")])
        .output()
        .unwrap();
    assert!(restored.status.success());
    assert_eq!(result.unwrap_err().kind(), io::ErrorKind::PermissionDenied);
    assert_eq!(
        sequential_result.unwrap_err().kind(),
        io::ErrorKind::PermissionDenied
    );
}
