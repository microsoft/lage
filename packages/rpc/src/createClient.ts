import { ResultsRelativeDir, TodoRelativeDir } from "./createServer.js";
import path from "path";
import fs from "fs";
import type { RunTargetResponse } from "./types/ILageService.js";
import { normalizeTargetFileName } from "./normalizeTargetFileName.js";

export interface CreateClientOptions {
  baseUrl: string;
  httpVersion: "1.1" | "2";
  root: string;
}

export type LageClient = ReturnType<typeof createClient>;

export function createClient({ root }: CreateClientOptions) {
  return {
    async runTarget({
      packageName,
      task,
      taskArgs,
      clientPid,
    }: {
      packageName?: string;
      task: string;
      taskArgs: string[];
      clientPid: number;
    }) {
      const todoDir = path.join(root, TodoRelativeDir);

      if (!fs.existsSync(todoDir)) {
        fs.mkdirSync(todoDir, { recursive: true });
      }

      const targetFileName = normalizeTargetFileName(`${packageName ?? ""}#${task}.json`);

      const todoFile = path.join(todoDir, targetFileName);
      fs.writeFileSync(
        todoFile,
        JSON.stringify({
          ...(packageName && { packageName }),
          task,
          taskArgs,
          clientPid,
        })
      );

      const resultsFile = path.join(root, ResultsRelativeDir, targetFileName);
      const resultsDir = path.dirname(resultsFile);
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      const responsePromise = new Promise<RunTargetResponse>((responsePromiseResolve, reject) => {
        const handler = setTimeout(() => {
          reject("timeout");
        }, 120 * 60 * 1000);

        process.on("SIGPIPE", () => {
          clearTimeout(handler);
          const results = JSON.parse(fs.readFileSync(resultsFile, "utf8"));
          fs.unlinkSync(resultsFile);
          return responsePromiseResolve(results);
        });
      });

      return await responsePromise;

      // const res = await fetch(`${baseUrl}/run-target`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     ...(packageName && { packageName }),
      //     task,
      //     taskArgs,
      //     clientPid,
      //   }),
      // });
      // const json = await res.json();
      // return json as RunTargetResponse;
    },

    async ping() {
      // const res = await fetch(`${baseUrl}/ping`, {
      //   method: "GET",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      // });

      // return (await res.json()) as { pong: boolean };
      return { pong: true };
    },
  };
}
