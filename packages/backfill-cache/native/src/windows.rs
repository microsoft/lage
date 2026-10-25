use std::{
    ffi::c_void,
    io,
    mem::{size_of, MaybeUninit},
    os::windows::{
        ffi::OsStrExt,
        io::{AsRawHandle, FromRawHandle, OwnedHandle},
    },
    path::{Path, PathBuf},
    ptr,
    sync::OnceLock,
};

use windows_sys::Win32::{
    Foundation::{SetLastError, ERROR_SUCCESS, INVALID_HANDLE_VALUE},
    Storage::FileSystem::{
        CreateFileW, FileBasicInfo, GetFileInformationByHandle, GetFileInformationByHandleEx,
        GetFileType, BY_HANDLE_FILE_INFORMATION, FILE_ATTRIBUTE_DEVICE, FILE_ATTRIBUTE_DIRECTORY,
        FILE_ATTRIBUTE_READONLY, FILE_ATTRIBUTE_REPARSE_POINT, FILE_BASIC_INFO,
        FILE_FLAG_BACKUP_SEMANTICS, FILE_FLAG_OPEN_REPARSE_POINT, FILE_READ_ATTRIBUTES,
        FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE, FILE_TYPE_DISK, FILE_TYPE_UNKNOWN,
        OPEN_EXISTING,
    },
    System::LibraryLoader::{GetProcAddress, LoadLibraryExW, LOAD_LIBRARY_SEARCH_SYSTEM32},
};

use crate::{missing, FileMetadata};

// FILE_STAT_BASIC_INFORMATION and GetFileInformationByName are not yet in windows-sys.
// Layout and class value are defined by the Windows SDK (winnt.h / fileapi.h).
#[repr(C)]
#[derive(Default)]
struct FileStatBasicInformation {
    file_id: i64,
    creation_time: i64,
    last_access_time: i64,
    last_write_time: i64,
    change_time: i64,
    allocation_size: i64,
    end_of_file: i64,
    file_attributes: u32,
    reparse_tag: u32,
    number_of_links: u32,
    device_type: u32,
    device_characteristics: u32,
    reserved: u32,
    volume_serial_number: i64,
    file_id_128: [u8; 16],
}

type GetInformationByName = unsafe extern "system" fn(*const u16, i32, *mut c_void, u32) -> i32;

fn information_by_name() -> Option<GetInformationByName> {
    static FUNCTION: OnceLock<Option<GetInformationByName>> = OnceLock::new();
    *FUNCTION.get_or_init(|| unsafe {
        let library_name: Vec<u16> = "api-ms-win-core-file-l2-1-4.dll\0".encode_utf16().collect();
        let library = LoadLibraryExW(
            library_name.as_ptr(),
            ptr::null_mut(),
            LOAD_LIBRARY_SEARCH_SYSTEM32,
        );
        if library.is_null() {
            return None;
        }
        // Retain this system library for the lifetime of the cached function pointer.
        GetProcAddress(library, c"GetFileInformationByName".as_ptr().cast())
            .map(|function| std::mem::transmute::<_, GetInformationByName>(function))
    })
}

fn windows_path(path: &Path) -> Vec<u16> {
    let bytes = path.as_os_str().as_encoded_bytes();
    // Node resolves ordinary paths before adding the long-path prefix, but leaves
    // already namespaced paths alone. In a namespace, "." is a literal component.
    let normalized: PathBuf = if bytes.starts_with(b"\\\\?\\") || bytes.starts_with(b"\\\\.\\") {
        path.into()
    } else {
        path.components().collect()
    };
    let path: Vec<u16> = normalized
        .as_os_str()
        .encode_wide()
        .map(|value| if value == 47 { 92 } else { value })
        .collect();
    let mut extended = if path.starts_with(&[92, 92, 63, 92]) || path.starts_with(&[92, 92, 46, 92])
    {
        path
    } else if path.starts_with(&[92, 92]) {
        "\\\\?\\UNC\\"
            .encode_utf16()
            .chain(path[2..].iter().copied())
            .collect()
    } else {
        "\\\\?\\".encode_utf16().chain(path).collect()
    };
    // Match libuv's Windows lstat handling of a trailing separator.
    if extended.len() > 1
        && extended[extended.len() - 2] != u16::from(b':')
        && extended
            .last()
            .is_some_and(|value| *value == 92 || *value == 47)
    {
        extended.pop();
    }
    extended.push(0);
    extended
}

fn regular_file(attributes: u32) -> bool {
    attributes & (FILE_ATTRIBUTE_DIRECTORY | FILE_ATTRIBUTE_REPARSE_POINT | FILE_ATTRIBUTE_DEVICE)
        == 0
}

fn mode(attributes: u32) -> u32 {
    0o100000
        | if attributes & FILE_ATTRIBUTE_READONLY != 0 {
            0o444
        } else {
            0o666
        }
}

fn node_nanoseconds(filetime: i64) -> i128 {
    let ticks = i128::from(filetime) - 116_444_736_000_000_000;
    // Node casts libuv's Windows 32-bit seconds to unsigned long, even before 1970.
    i128::from(ticks.div_euclid(10_000_000) as u32) * 1_000_000_000
        + ticks.rem_euclid(10_000_000) * 100
}

pub(super) fn file_metadata(path: &Path) -> io::Result<Option<FileMetadata>> {
    let path = windows_path(path);
    if let Some(query) = information_by_name() {
        let mut info = FileStatBasicInformation::default();
        // FileStatBasicByNameInfo = 3. This retrieves identity, size and ChangeTime together.
        if unsafe {
            query(
                path.as_ptr(),
                3,
                (&mut info as *mut FileStatBasicInformation).cast(),
                size_of::<FileStatBasicInformation>() as u32,
            )
        } != 0
        {
            // FILE_DEVICE_NULL is the special NUL device, not a regular file.
            if !regular_file(info.file_attributes) || info.device_type == 0x15 {
                return Ok(None);
            }
            return Ok(Some(FileMetadata {
                dev: u64::from(info.volume_serial_number as u32),
                ino: info.file_id as u64,
                mode: mode(info.file_attributes),
                size: info.end_of_file as u64,
                mtime_ns: node_nanoseconds(info.last_write_time),
                ctime_ns: node_nanoseconds(info.change_time),
            }));
        }
        let error = io::Error::last_os_error();
        if missing(&error) {
            return Err(error);
        }
    }
    metadata_by_handle(&path)
}

fn metadata_by_handle(path: &[u16]) -> io::Result<Option<FileMetadata>> {
    let handle = unsafe {
        CreateFileW(
            path.as_ptr(),
            FILE_READ_ATTRIBUTES,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            ptr::null(),
            OPEN_EXISTING,
            FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
            ptr::null_mut(),
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        return Err(io::Error::last_os_error());
    }
    // Every successful open is closed, including errors and non-file results.
    let handle = unsafe { OwnedHandle::from_raw_handle(handle) };
    unsafe { SetLastError(ERROR_SUCCESS) };
    let file_type = unsafe { GetFileType(handle.as_raw_handle()) };
    if file_type == FILE_TYPE_UNKNOWN {
        let error = io::Error::last_os_error();
        if error.raw_os_error() != Some(0) {
            return Err(error);
        }
    }
    if file_type != FILE_TYPE_DISK {
        return Ok(None);
    }
    let mut identity = MaybeUninit::<BY_HANDLE_FILE_INFORMATION>::uninit();
    if unsafe { GetFileInformationByHandle(handle.as_raw_handle(), identity.as_mut_ptr()) } == 0 {
        return Err(io::Error::last_os_error());
    }
    let identity = unsafe { identity.assume_init() };
    let mut basic = MaybeUninit::<FILE_BASIC_INFO>::uninit();
    if unsafe {
        GetFileInformationByHandleEx(
            handle.as_raw_handle(),
            FileBasicInfo,
            basic.as_mut_ptr().cast(),
            size_of::<FILE_BASIC_INFO>() as u32,
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    let basic = unsafe { basic.assume_init() };
    if !regular_file(basic.FileAttributes) {
        return Ok(None);
    }
    Ok(Some(FileMetadata {
        dev: u64::from(identity.dwVolumeSerialNumber),
        ino: (u64::from(identity.nFileIndexHigh) << 32) | u64::from(identity.nFileIndexLow),
        mode: mode(basic.FileAttributes),
        size: (u64::from(identity.nFileSizeHigh) << 32) | u64::from(identity.nFileSizeLow),
        mtime_ns: node_nanoseconds(basic.LastWriteTime),
        // CreationTime is Node's birthtime, not its status-change timestamp.
        ctime_ns: node_nanoseconds(basic.ChangeTime),
    }))
}

#[cfg(test)]
pub(super) fn file_metadata_by_handle(path: &Path) -> io::Result<Option<FileMetadata>> {
    metadata_by_handle(&windows_path(path))
}

#[test]
fn by_name_api_layout_matches_windows_sdk() {
    assert_eq!(size_of::<FileStatBasicInformation>(), 104);
}
