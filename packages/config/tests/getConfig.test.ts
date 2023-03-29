import { getConfig } from "../src/getConfig";
import path from "path";

describe("getConfig", () => {
  it("should read from an asynchronous config file", async () => {
    const config = await getConfig(path.join(__dirname, "fixtures", "async-config"));
    expect(config.pipeline).toBeTruthy();
  });

  it("should read from an synchronous config file", async () => {
    const config = await getConfig(path.join(__dirname, "fixtures", "sync-config"));
    expect(config.pipeline).toBeTruthy();
  });
});
