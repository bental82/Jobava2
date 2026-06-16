// PGN parsing for the repertoire.
//
// We use @mliebelt/pgn-parser to parse the PGN tree INCLUDING all variations
// (RAV) and comments, then replay the SAN moves through chess.js purely to
// generate FENs and validate legality. We deliberately do NOT use chess.js's
// own PGN loader because it discards variations.

import { parse } from '@mliebelt/pgn-parser';
import { Chess } from 'chess.js';
import { pathKey, type TreeNode } from './tree';

// The parser's move objects are loosely typed; describe the bits we read.
interface RawMove {
  moveNumber?: number | null;
  notation?: { notation?: string };
  turn?: 'w' | 'b';
  nag?: string[] | null;
  commentBefore?: string;
  commentAfter?: string;
  commentMove?: string;
  commentDiag?: unknown;
  variations?: RawMove[][];
}

interface RawGame {
  tags?: Record<string, unknown>;
  moves: RawMove[];
}

export interface ParsedRepertoire {
  /** Synthetic root node = the initial position before any move. */
  root: TreeNode;
  tags: Record<string, unknown>;
}

const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1';

/** Collapse the parser's various comment fields into one trimmed string. */
function extractComment(m: RawMove): string | null {
  const parts = [m.commentMove, m.commentBefore, m.commentAfter]
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter((c) => c.length > 0);
  const text = parts.join(' ').trim();
  return text.length > 0 ? text : null;
}

/**
 * Recursively attach the moves in `line` (a mainline sequence) as descendants
 * of `parent`. `parentFen` is the FEN at `parent`. `sanPath` is the SAN
 * sequence from the root to `parent`.
 *
 * Crucially: a parser move's `variations` are ALTERNATIVES to that move,
 * branching from the SAME position as the move itself (i.e. from `parent`).
 * So we add both the move and each of its variations as children of `parent`,
 * preserving every branch.
 */
function attachLine(
  line: RawMove[],
  parent: TreeNode,
  parentFen: string,
  sanPath: string[],
): void {
  let current = parent;
  let currentFen = parentFen;
  let currentPath = sanPath;

  for (const rawMove of line) {
    const san = rawMove.notation?.notation;
    if (!san) continue;

    // First, this move's variations branch from `current` (the position
    // BEFORE this move). Attach them as siblings of the move we're about to
    // add. We attach the move first so children[0] stays the main line, then
    // the variations follow in order.
    const node = makeNode(rawMove, san, current, currentFen, currentPath);
    if (!node) {
      // Illegal SAN for this position — should not happen with a clean PGN,
      // but skip defensively rather than crash the whole parse.
      // eslint-disable-next-line no-console
      console.warn(`Skipping illegal move "${san}" after [${currentPath.join(' ')}]`);
      continue;
    }
    current.children.push(node);

    const variations = rawMove.variations ?? [];
    for (const variation of variations) {
      attachLine(variation, current, currentFen, currentPath);
    }

    // Descend the main line.
    current = node;
    currentFen = node.fen;
    currentPath = [...currentPath, san];
  }
}

/** Create a TreeNode for `san` played from `parent` (FEN `parentFen`). */
function makeNode(
  rawMove: RawMove,
  san: string,
  parent: TreeNode,
  parentFen: string,
  parentPath: string[],
): TreeNode | null {
  const chess = new Chess(parentFen);
  let moveResult;
  try {
    moveResult = chess.move(san);
  } catch {
    return null;
  }
  if (!moveResult) return null;

  const newPath = [...parentPath, san];
  const fen = chess.fen();
  const turn = chess.turn() as 'w' | 'b'; // side to move FROM the new position
  const playedBy = moveResult.color as 'w' | 'b';

  return {
    id: pathKey(newPath),
    san,
    fen,
    ply: parent.ply + 1,
    turn,
    moveNumber: Math.floor(parent.ply / 2) + 1,
    playedBy,
    comment: extractComment(rawMove),
    nags: rawMove.nag ?? [],
    children: [],
  };
}

/** Parse the PGN string into a repertoire tree, preserving all variations. */
export function parseRepertoire(pgnText: string): ParsedRepertoire {
  const games = parse(pgnText, { startRule: 'games' }) as unknown as RawGame[];
  if (!games || games.length === 0) {
    throw new Error('No game found in PGN.');
  }
  const game = games[0];

  const root: TreeNode = {
    id: '',
    san: null,
    fen: START_FEN,
    ply: 0,
    turn: 'w',
    moveNumber: 1,
    playedBy: null,
    comment: null,
    nags: [],
    children: [],
  };

  attachLine(game.moves, root, root.fen, []);

  return { root, tags: (game.tags ?? {}) as Record<string, unknown> };
}
