// Cargo runs this before compiling the addon. NAPI-RS configures platform-specific
// linking and rebuild triggers for its code-generation environment variables.
extern crate napi_build;

fn main() {
  napi_build::setup();
}
