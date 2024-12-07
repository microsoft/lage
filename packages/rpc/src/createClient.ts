// import { createPromiseClient } from "@connectrpc/connect";
// import { createGrpcTransport } from "@connectrpc/connect-node";
// import { LageService } from "./gen/lage/v1/lage_connect.js";
// import { RunTargetRequest } from "./gen/lage/v1/lage_pb.js";
import net from "net";
import type { RunTargetRequest } from "./gen/lage/v1/lage_pb.js";
export interface CreateClientOptions {
  baseUrl: string;
  httpVersion: "1.1" | "2";
}

export type LageClient = ReturnType<typeof createClient>;

// Function to make RPC calls
function rpcCall(socket: net.Socket, method: string, params: any) {
  return new Promise((resolve, reject) => {
    const id = Date.now(); // Unique ID for the request
    const request = JSON.stringify({ id, method, params });
    let responseData = "";

    // Listen for the response
    const onData = (data) => {
      responseData += data.toString();

      let delimiterIndex;
      while ((delimiterIndex = responseData.indexOf("\0")) !== -1) {
        const completeMessage = responseData.slice(0, delimiterIndex);
        responseData = responseData.slice(delimiterIndex + 1);

        try {
          const response = JSON.parse(completeMessage);
          if (response.id === id) {
            socket.removeListener("data", onData); // Clean up listener
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.result);
            }
          }
        } catch (e) {
          reject(new Error("Failed to parse response"));
        }
      }
    };

    socket.on("data", onData);

    // Send the request
    console.log("Sending request", request);
    socket.write(request + "\0");
  });
}

let clientPromise: Promise<net.Socket>;

function ensureClient() {
  if (!clientPromise) {
    clientPromise = new Promise((resolve, reject) => {
      const client = net.createConnection({ port: 5332, host: "localhost" }, () => {
        resolve(client);
      });
    });
  }

  return clientPromise;
}

export function createClient({ baseUrl, httpVersion }: CreateClientOptions) {
  // const transport = createGrpcTransport({
  //   httpVersion,
  //   baseUrl,
  // });

  // return createPromiseClient(LageService, transport);

  return {
    async runTarget(request: any) {
      const client = await ensureClient();
      const response = await rpcCall(client, "runTarget", request);
      return response as any;
    },

    async ping(request: any) {
      const client = await ensureClient();
      const response = await rpcCall(client, "ping", request);
      return response as any;
    },
  };
}
