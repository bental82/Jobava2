// Engine seam.
//
// Stockfish is OPTIONAL and intentionally NOT wired up yet. This module
// defines the typed interface the rest of the app (and the enrich script)
// would use, plus a null implementation. To add Stockfish later:
//
//   1. Add a single-threaded stockfish WASM build under /public (so no
//      COOP/COEP cross-origin-isolation headers are needed on Vercel).
//   2. Implement `analyze` by posting UCI commands to a Web Worker and
//      parsing `info ... pv ...` / `bestmove` lines.
//   3. In the enrich script, call analyze(fen) and pass `EngineLine[]` into
//      the prompt; in the UI, render the eval bar + top lines in NodePanel.
//
// Nothing else needs to change: the explanation cache already hashes engine
// input (see explanationInputHash), so turning the engine on will correctly
// invalidate and regenerate affected nodes.

export interface EngineLine {
  /** Centipawn score from White's perspective (positive = better for White). */
  scoreCp: number | null;
  /** Mate-in-N from White's perspective, if forced mate detected. */
  mateIn: number | null;
  /** Principal variation as SAN moves. */
  pv: string[];
  /** The first move of the PV in SAN — the candidate move. */
  move: string;
}

export interface EngineAnalysis {
  fen: string;
  /** Top candidate lines, best first (typically 2-3). */
  lines: EngineLine[];
  depth: number;
}

export interface Engine {
  readonly enabled: boolean;
  analyze(fen: string, opts?: { depth?: number; multiPv?: number }): Promise<EngineAnalysis | null>;
}

/** The default, dormant engine. analyze() always resolves to null. */
export const nullEngine: Engine = {
  enabled: false,
  async analyze() {
    return null;
  },
};

/**
 * Render an EngineAnalysis as a compact, human-readable summary for use in the
 * enrich prompt (and for hashing). Returns null when no analysis is available.
 */
export function summarizeEngine(analysis: EngineAnalysis | null): string | null {
  if (!analysis || analysis.lines.length === 0) return null;
  return analysis.lines
    .map((line, i) => {
      const score =
        line.mateIn !== null
          ? `#${line.mateIn}`
          : line.scoreCp !== null
            ? (line.scoreCp / 100).toFixed(2)
            : '?';
      return `${i + 1}. ${line.move} (${score}) ${line.pv.slice(0, 4).join(' ')}`;
    })
    .join('  |  ');
}
