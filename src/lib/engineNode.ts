// Node-side Stockfish engine, used ONLY by the offline enrich script. This
// module imports the `stockfish` package (a Node/Worker artifact) and must
// never be imported by app/client code, so it isn't bundled for the browser.

import { analyzePosition, initEngine, type UciTransport } from './uci';
import type { Engine, EngineAnalysis } from './engine';

interface SfInstance {
  postMessage(cmd: string): void;
  onmessage: ((line: unknown) => void) | null;
}

export interface NodeEngine extends Engine {
  quit(): void;
}

/** Create and UCI-initialize a reusable Node engine for batch analysis. */
export async function createNodeEngine(
  opts: { depth?: number; multiPv?: number } = {},
): Promise<NodeEngine> {
  const depth = opts.depth ?? 14;
  const multiPv = opts.multiPv ?? 3;

  // Dynamic import keeps this out of any bundler graph that includes the client.
  const mod = (await import('stockfish')) as unknown as {
    default?: (wasmPath?: string) => SfInstance;
  };
  const factory = mod.default ?? (mod as unknown as (wasmPath?: string) => SfInstance);
  const sf = factory();

  const listeners = new Set<(line: string) => void>();
  sf.onmessage = (msg: unknown) => {
    const line =
      typeof msg === 'string' ? msg : (msg as { data?: unknown })?.data;
    if (typeof line === 'string') for (const l of listeners) l(line);
  };

  const transport: UciTransport = {
    post: (cmd) => sf.postMessage(cmd),
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };

  await initEngine(transport);

  return {
    enabled: true,
    async analyze(fen: string): Promise<EngineAnalysis | null> {
      return analyzePosition(transport, fen, { depth, multiPv, timeoutMs: 20000 });
    },
    quit() {
      try {
        sf.postMessage('quit');
      } catch {
        /* ignore */
      }
    },
  };
}
