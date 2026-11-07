import fs from "fs";
import jju from "jju";
import path from "path";
import { managerFiles } from "./getWorkspaceManagerAndRoot.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";

export const rushUtilities: WorkspaceUtilities = {
  getWorkspacePatterns: ({ root }) => {
    const rushConfig = jju.parse(fs.readFileSync(path.join(root, managerFiles.rush), "utf-8")) as {
      projects: Array<{ projectFolder: string }>;
    };
    // The rush config "projects" are single folder paths
    const patterns = rushConfig.projects.map((p) => p.projectFolder);
    return { patterns, type: "path" };
  },
};
