import { type Socket, connect } from "net";
import { getPipePath } from "./pipe-path.js";

export class LageDaemonClient {
  private client: Socket | undefined;

  constructor(private root: string) {}

  #ensureClient() {
    if (this.client === undefined) {
      const pipePath = getPipePath(this.root);
      this.client = connect(pipePath);
    }
    return this.client!;
  }

  async call(fn: string, args: any[]) {
    const client = this.#ensureClient();
    client.write(JSON.stringify({ fn, args }));

    return new Promise((resolve, reject) => {
      client.on("data", (data) => {
        const dataString = data.toString();
        const message = JSON.parse(dataString);

        if (message.results) {
          return resolve(message.results);
        }

        if (message.errors) {
          return reject(message.errors);
        }

        resolve(undefined);
        client.end();
      });
    });
  }

  close() {
    if (this.client) {
      this.client.end();
    }
  }
}
