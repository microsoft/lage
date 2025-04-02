import { parseServerOption } from "../src/commands/parseServerOption.js";

describe("parseServerOption", () => {
  it("parses regular host:port strings", () => {
    expect(parseServerOption("localhost:5332")).toEqual({ host: "localhost", port: 5332 });
  });

  it("parses host strings", () => {
    expect(parseServerOption("localhost")).toEqual({ host: "localhost", port: 5332 });
  });

  it("parses empty strings", () => {
    expect(parseServerOption("")).toEqual({ host: "localhost", port: 5332 });
  });

  it("parses undefined", () => {
    expect(parseServerOption(undefined)).toEqual({ host: "localhost", port: 5332 });
  });

  it("parses false", () => {
    expect(parseServerOption(false)).toEqual({ host: "localhost", port: 5332 });
  });

  it("parses true", () => {
    expect(parseServerOption(true)).toEqual({ host: "localhost", port: 5332 });
  });

  it("parses other values", () => {
    expect(parseServerOption("other")).toEqual({ host: "other", port: 5332 });
  });

  it("parses other values with port", () => {
    expect(parseServerOption("other:1234")).toEqual({ host: "other", port: 1234 });
  });
});
