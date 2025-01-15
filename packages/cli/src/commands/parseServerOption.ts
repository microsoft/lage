export function parseServerOption(server: boolean | string | undefined): {
    host: string;
    port: number;
} {
  const isBooleanAndTrue = typeof server === "boolean" && server;
  const isEmptyServer = typeof server === "undefined" || server === false;
  const serverString = isBooleanAndTrue ? "localhost:5332" : isEmptyServer ? "localhost:5332" : server;

  if (serverString.includes(":")) {
    const parts = serverString.split(":");

    const host = parts[0];
    const port = parseInt(parts[1] ?? "5332");
    return { host, port };
  } else if (serverString.length === 0) {
    return { host: "localhost", port: 5332 };
  } else {
    return { host: serverString, port: 5332 };
  }
}
