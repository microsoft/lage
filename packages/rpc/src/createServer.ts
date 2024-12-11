import fs from "fs";
import path from "path";
import { getWorkspaceRoot } from "workspace-tools";
import type { ILageService, RunTargetRequest } from "./types/ILageService.js";
import { normalizeTargetFileName } from "./normalizeTargetFileName.js";

const HEARTBEAT_INTERVAL = 1500;
export const TodoRelativeDir = `node_modules/.cache/lage/server/todo`;
export const ResultsRelativeDir = `node_modules/.cache/lage/server/results`;

export async function createServer(lageService: ILageService) {
  return new Server(lageService);
}

class Server {
  private root: string;
  private todoDir: string;
  private resultsDir: string;
  private interval?: NodeJS.Timeout;

  constructor(private lageService: ILageService) {
    this.root = getWorkspaceRoot(process.cwd())!;
    this.todoDir = path.join(this.root, TodoRelativeDir);
    this.resultsDir = path.join(this.root, ResultsRelativeDir);

    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    if (!fs.existsSync(this.todoDir)) {
      fs.mkdirSync(this.todoDir, { recursive: true });
    }

    process.on("exit", () => {
      this.close();
      fs.rmdirSync(this.todoDir, { recursive: true });
      fs.rmdirSync(this.resultsDir, { recursive: true });
    });
  }

  listen() {
    this.interval = setInterval(this.onHeartbeat.bind(this), HEARTBEAT_INTERVAL);
  }

  close() {
    clearInterval(this.interval);
  }

  private onHeartbeat() {
    const { todoDir, resultsDir, lageService } = this;

    const todoFiles = fs.readdirSync(todoDir);

    console.log("todoFiles", todoFiles);

    for (const todoFile of todoFiles) {
      const todo = JSON.parse(fs.readFileSync(path.join(todoDir, todoFile), "utf-8")) as RunTargetRequest;
      fs.unlinkSync(path.join(todoDir, todoFile));

      lageService.runTarget(todo).then((results) => {
        const resultsFile = path.join(resultsDir, normalizeTargetFileName(`${todo.packageName ?? ""}#${todo.task}.json`));

        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 0));

        // send SIGPIPE to the client process to notify that the results are ready
        try {
          process.kill(todo.clientPid, "SIGPIPE");
        } catch (e) {
          console.error(`Error sending SIGPIPE ${todo.clientPid}`, e);
        }
      });
    }
  }
}
