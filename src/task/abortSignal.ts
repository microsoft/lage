import AbortController from "abort-controller";

const controller = new AbortController();
const signal = controller.signal;

export { controller, signal };
