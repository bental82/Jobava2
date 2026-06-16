// Loading and typing for the pre-generated explanation cache
// (data/explanations.json). The deployed app only READS this file — it never
// calls the Anthropic API at runtime. Generation happens offline via
// `npm run enrich` (scripts/enrich.ts).

import type { TreeNode } from './tree';

export interface Explanation {
  /** Node id (move-path key) this explanation belongs to. */
  key: string;
  /** SAN of the move at this node (for human-readable cache inspection). */
  san: string | null;
  /** The generated verbal rationale (Hebrew). */
  rationale: string;
  /**
   * Move quality of the move that led to this node, from the perspective of
   * the side that played it. Drives the board arrow color:
   *  'good'    -> green, 'dubious' -> orange, 'blunder' -> red.
   * Optional: older caches / API-generated entries may omit it.
   */
  quality?: 'good' | 'dubious' | 'blunder';
  /** Model that produced it, e.g. "claude-sonnet-4-6". */
  model: string;
  /**
   * Hash of the exact inputs used to generate this explanation. Lets the
   * enrich script skip nodes whose inputs are unchanged (cache-by-content).
   */
  inputHash: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
}

export type ExplanationMap = Record<string, Explanation>;

/**
 * Compute the input hash for a node. Must stay in sync with what the enrich
 * script actually sends to the model, so that changing any input invalidates
 * the cache entry. Engine info is included so enabling Stockfish later will
 * (correctly) invalidate and regenerate.
 */
export function explanationInputHash(input: {
  key: string;
  fen: string;
  comment: string | null;
  nags: string[];
  engineSummary?: string | null;
}): string {
  const payload = JSON.stringify({
    key: input.key,
    fen: input.fen,
    comment: input.comment ?? '',
    nags: input.nags,
    engine: input.engineSummary ?? '',
  });
  // Small, dependency-free FNV-1a 32-bit hash — enough to detect changes.
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Look up the explanation for a node, or null if not yet generated. */
export function explanationFor(
  map: ExplanationMap,
  node: TreeNode,
): Explanation | null {
  return map[node.id] ?? null;
}
