// import { connectNodeAdapter } from "@connectrpc/connect-node";
// import { createRoutes } from "./createRoutes.js";
// import http from "http";

import net from "net";
import type { ILageService } from "./types/ILageService.js";
import { toNamespacedPath } from "path";

interface DataFormat {
  method: string;
  args: Map<string, any>;
}

export async function createServer(lageService: ILageService, abortController: AbortController) {
  // http.globalAgent.maxSockets = 10;
  // const server = http.createServer(
  //   connectNodeAdapter({ routes: createRoutes(lageService) }) // responds with 404 for other requests
  // );

  abortController.signal.addEventListener("abort", () => {
    server.close();
    server.unref();
  });

  // return server;

  const server = net.createServer((socket) => {
    console.log("Client connected");
    let shouldCleanup = false;
    let responseData = "";

    const onData = async (data: Buffer) => {
      responseData += data.toString();

      let delimiterIndex;
      while ((delimiterIndex = responseData.indexOf("\0")) !== -1) {
        const completeMessage = responseData.slice(0, delimiterIndex);
        responseData = responseData.slice(delimiterIndex + 1);

        try {
          // Parse the incoming request
          const request = JSON.parse(completeMessage);
          const { id, method, params } = request;
          console.log("method", method, params);

          // Check if the method exists
          if (lageService[method]) {
            const result = await lageService[method](params);
            // Send the response
            const response = JSON.stringify({ id, result }) + "\0"; // Add delimiter
            socket.write(response);
            shouldCleanup = false;

            if (method === "runTarget") {
              shouldCleanup = true;
            }
          } else {
            throw new Error(`Method ${method} not found`);
          }
        } catch (err) {
          // Send error response
          const response = JSON.stringify({ error: err }) + "\0"; // Add delimiter
          socket.write(response);
        } finally {
          // Clean up listener
          if (shouldCleanup) {
            socket.removeListener("data", onData);
            socket.end();
          }
        }
      }
    };

    socket.on("data", onData);
  });

  return server;
}
