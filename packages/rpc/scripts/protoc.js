const execa = require("execa");
const path = require("path");
execa.sync(`node_modules/.bin/grpc_tools_node_protoc${process.platform === "win32" ? ".cmd" : ""}`, [
  "-I=.",
  /** protoc-gen-ts */
  "--ts_out=src/proto",
  "--ts_opt=json_name",
  "--ts_opt=target=node",
  "--ts_opt=unary_rpc_promise=true",
  `--plugin=protoc-gen-ts=${path.join("node_modules", ".bin", `protoc-gen-ts${process.platform === "win32" ? ".cmd" : ""}`)}`,

  "proto/*.proto",
]);
