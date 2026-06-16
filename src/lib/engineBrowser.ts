// Browser-side Stockfish engine (single-threaded WASM in a Web Worker).
//
// Single-threaded => no SharedArrayBuffer => no COOP/COEP cross-origin
// isolation headers needed, so it deploys cleanly on Vercel. The engine files
// live in /public/stockfish; the wasm path is passed via the worker URL hash.
//
// Scheduling is "latest-wins": while one position is being analyzed, a newer
// request supersedes any queued one and sends `stop` to cut the current search
// short, so fast navigation stays responsive without piling up work.

import { analyzePosition, initEngine, type UciTransport } from './uci';
import type { EngineAnalysis } from './engine';

const WORKER_URL = '/stockfish/stockfish.js#/stockfish/stockfish.wasm';

interface PendingJob {
  fen: string;
  resolve: (a: EngineAnalysis | null) => void;
}

export class BrowserEngine {
  private worker: Worker;
  private transport: UciTransport;
  private ready: Promise<void>;
  private listeners = new Set<(line: string) => void>();
  private pending: PendingJob | null = null;
  private running = false;
  private destroyed = false;

  constructor(
    private readonly opts: { depth: number; multiPv: number } = { depth: 14, multiPv: 3 },
  ) {
    this.worker = new Worker(WORKER_URL);
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : (e.data?.data ?? '');
      if (typeof line === 'string' && line.length > 0) {
        for (const l of this.listeners) l(line);
      }
    };
    this.transport = {
      post: (cmd) => this.worker.postMessage(cmd),
      subscribe: (cb) => {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
      },
    };
    this.ready = initEngine(this.transport);
  }

  /** Analyze `fen`. Supersedes any queued (not-yet-started) request. */
  analyze(fen: string): Promise<EngineAnalysis | null> {
    if (this.destroyed) return Promise.resolve(null);
    return new Promise((resolve) => {
      if (this.pending) this.pending.resolve(null); // supersede the queued one
      this.pending = { fen, resolve };
      void this.pump();
    });
  }

  private async pump(): Promise<void> {
    if (this.running) {
      // Cut the in-flight search so the loop reaches the newer pending job.
      this.transport.post('stop');
      return;
    }
    this.running = true;
    await this.ready;
    while (this.pending && !this.destroyed) {
      const job = this.pending;
      this.pending = null;
      const result = await analyzePosition(this.transport, job.fen, {
        depth: this.opts.depth,
        multiPv: this.opts.multiPv,
        timeoutMs: 15000,
      });
      job.resolve(result);
    }
    this.running = false;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.pending) {
      this.pending.resolve(null);
      this.pending = null;
    }
    try {
      this.worker.postMessage('quit');
    } catch {
      /* ignore */
    }
    this.worker.terminate();
  }
}
