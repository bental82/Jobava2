// Minimal type declaration for the `stockfish` (10.0.2) package. The package
// exports a factory function returning an engine that speaks UCI via
// postMessage / onmessage.
declare module 'stockfish' {
  interface StockfishInstance {
    postMessage(command: string): void;
    onmessage: ((line: unknown) => void) | null;
  }
  const factory: (wasmPath?: string) => StockfishInstance;
  export default factory;
}
