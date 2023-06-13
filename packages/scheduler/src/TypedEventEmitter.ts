import EventEmitter from "events";

type Handler = Parameters<EventEmitter["on"]>[1];

export class TypedEventEmitter<TEvents extends Record<string, any>> {
  private emitter = new EventEmitter();

  emit<TEventName extends keyof TEvents & string>(eventName: TEventName, ...eventArg: TEvents[TEventName]) {
    return this.emitter.emit(eventName, ...(eventArg as []));
  }

  on<TEventName extends keyof TEvents & string>(eventName: TEventName, handler: (...eventArg: TEvents[TEventName]) => void) {
    this.emitter.on(eventName, handler as Handler);
    return this;
  }

  once<TEventName extends keyof TEvents & string>(eventName: TEventName, handler: (...eventArg: TEvents[TEventName]) => void) {
    this.emitter.on(eventName, handler as Handler);
    return this;
  }

  off<TEventName extends keyof TEvents & string>(eventName: TEventName, handler: (...eventArg: TEvents[TEventName]) => void) {
    this.emitter.off(eventName, handler as Handler);
    return this;
  }
}
