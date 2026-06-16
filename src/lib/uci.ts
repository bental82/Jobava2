// Shared UCI helpers — pure logic used by BOTH the Node engine (enrich) and the
// browser worker engine (eval bar). Transport differs; this parsing does not.

import { Chess } from 'chess.js';
import type { EngineAnalysis, EngineLine } from './engine';

/** A transport abstracts "send a UCI command" and "subscribe to output lines". */
export interface UciTransport {
  post(cmd: string): void;
  /** Register a line listener; returns an unsubscribe function. */
  subscribe(cb: (line: string) => void): () => void;
}

interface ParsedInfo {
  multipv: number;
  scoreCp: number | null; // side-to-move POV
  mateIn: number | null; // side-to-move POV
  pvUci: string[];
}

/** Parse a single `info ... multipv K ... score ... pv ...` line. */
export function parseInfoLine(line: string): ParsedInfo | null {
  if (!line.startsWith('info') || !line.includes(' pv ')) return null;
  const tokens = line.trim().split(/\s+/);

  let multipv = 1;
  let scoreCp: number | null = null;
  let mateIn: number | null = null;
  let pvUci: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'multipv') {
      multipv = parseInt(tokens[i + 1], 10) || 1;
    } else if (t === 'score') {
      const kind = tokens[i + 1];
      const val = parseInt(tokens[i + 2], 10);
      if (kind === 'cp') scoreCp = val;
      else if (kind === 'mate') mateIn = val;
    } else if (t === 'pv') {
      pvUci = tokens.slice(i + 1);
      break;
    }
  }
  return { multipv, scoreCp, mateIn, pvUci };
}

/** Flip a side-to-move score to White's POV. */
function toWhitePov(value: number, whiteToMove: boolean): number {
  return whiteToMove ? value : -value;
}

/** Convert a UCI principal variation to SAN, given the starting FEN. */
function pvToSan(fen: string, pvUci: string[]): string[] {
  const chess = new Chess(fen);
  const san: string[] = [];
  for (const uci of pvUci) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    try {
      const m = chess.move({ from, to, promotion });
      if (!m) break;
      san.push(m.san);
    } catch {
      break;
    }
  }
  return san;
}

/**
 * Drive a UCI engine to analyze one position. Assumes the engine is already
 * UCI-initialized (see initEngine). Resolves on `bestmove`.
 */
export function analyzePosition(
  transport: UciTransport,
  fen: string,
  opts: { depth: number; multiPv: number; timeoutMs?: number },
): Promise<EngineAnalysis> {
  const whiteToMove = new Chess(fen).turn() === 'w';
  const best = new Map<number, ParsedInfo>();
  let lastDepth = 0;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      unsubscribe();
      clearTimeout(timer);

      const lines: EngineLine[] = [...best.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, info]) => {
          const pv = pvToSan(fen, info.pvUci);
          return {
            scoreCp: info.scoreCp !== null ? toWhitePov(info.scoreCp, whiteToMove) : null,
            mateIn: info.mateIn !== null ? toWhitePov(info.mateIn, whiteToMove) : null,
            pv,
            move: pv[0] ?? '',
          };
        })
        .filter((l) => l.move.length > 0);

      resolve({ fen, lines, depth: lastDepth });
    };

    const unsubscribe = transport.subscribe((line) => {
      if (line.startsWith('info') && line.includes(' pv ')) {
        const parsed = parseInfoLine(line);
        if (parsed) {
          best.set(parsed.multipv, parsed);
          const dMatch = line.match(/\bdepth (\d+)/);
          if (dMatch) lastDepth = Math.max(lastDepth, parseInt(dMatch[1], 10));
        }
      } else if (line.startsWith('bestmove')) {
        finish();
      }
    });

    const timer = setTimeout(finish, opts.timeoutMs ?? 20000);

    transport.post(`setoption name MultiPV value ${opts.multiPv}`);
    transport.post(`position fen ${fen}`);
    transport.post(`go depth ${opts.depth}`);
  });
}

/** Send the initial UCI handshake and wait for readiness. */
export function initEngine(transport: UciTransport, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      unsubscribe();
      clearTimeout(timer);
      resolve();
    };
    const unsubscribe = transport.subscribe((line) => {
      if (line.startsWith('readyok')) done();
    });
    const timer = setTimeout(done, timeoutMs);
    transport.post('uci');
    transport.post('isready');
  });
}
