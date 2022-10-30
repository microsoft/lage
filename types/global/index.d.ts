declare interface AbortSignal {
  abort(): void;
  addEventListener: (event: string, listener: () => void) => void;
  removeEventListener: (event: string, listener: () => void) => void;
}
