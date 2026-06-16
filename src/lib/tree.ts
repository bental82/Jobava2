// Tree model for the repertoire. The PGN is a TREE (heavy RAV use), so we
// represent it as one — every position is a node, every legal continuation a
// child. The first child of a node is the "main line" continuation from that
// position; subsequent children are the variations (alternatives) the PGN
// listed for that same position.

export interface TreeNode {
  /** Stable id = move-path key from the root (see pathKey). "" for the root. */
  id: string;
  /** SAN of the move that LED to this node, e.g. "Bf4". null for the root. */
  san: string | null;
  /** FEN of the position AT this node (after `san` was played). */
  fen: string;
  /** Ply depth from the root (root = 0). */
  ply: number;
  /** Whose move it is to play FROM this position: 'w' | 'b'. */
  turn: 'w' | 'b';
  /** Full move number to display for `san` (the move that led here). */
  moveNumber: number;
  /** 'w' | 'b' — who PLAYED `san` (null for root). */
  playedBy: 'w' | 'b' | null;
  /** Original PGN comment text attached to this move, if any. */
  comment: string | null;
  /** NAG codes (e.g. "$1") attached to this move, if any. */
  nags: string[];
  /** Continuations from this position. children[0] is the main line. */
  children: TreeNode[];
}

/** Separator used in move-path keys. Spaces are safe: SAN never contains one. */
const SEP = ' ';

/**
 * Build the stable key for a node from the SAN sequence leading to it.
 * Example: ["d4","d5","c4"] -> "d4 d5 c4". The root is "".
 *
 * This is "intent"-based: two move orders that transpose to the same FEN get
 * different keys, which is what we want — the repertoire teaches a line via a
 * specific move order, and the rationale follows that order.
 */
export function pathKey(sanPath: string[]): string {
  return sanPath.join(SEP);
}

/** Split a key back into its SAN sequence. "" -> []. */
export function keyToPath(key: string): string[] {
  return key.length === 0 ? [] : key.split(SEP);
}

/** Depth-first walk over every node (root included). */
export function walk(root: TreeNode, visit: (node: TreeNode) => void): void {
  visit(root);
  for (const child of root.children) walk(child, visit);
}

/** Count nodes excluding the root (i.e. number of moves/positions). */
export function countMoves(root: TreeNode): number {
  let n = 0;
  walk(root, (node) => {
    if (node.san !== null) n += 1;
  });
  return n;
}

/** Find a node by its id (move-path key). Returns null if absent. */
export function findById(root: TreeNode, id: string): TreeNode | null {
  let found: TreeNode | null = null;
  walk(root, (node) => {
    if (node.id === id) found = node;
  });
  return found;
}

/**
 * Return the path of nodes from the root (exclusive of root) down to `id`.
 * Used to render the SAN sequence leading to a position. Empty for the root.
 */
export function lineToId(root: TreeNode, id: string): TreeNode[] {
  const result: TreeNode[] = [];
  function dfs(node: TreeNode, acc: TreeNode[]): boolean {
    const next = node.san === null ? acc : [...acc, node];
    if (node.id === id) {
      result.push(...next);
      return true;
    }
    for (const child of node.children) {
      if (dfs(child, next)) return true;
    }
    return false;
  }
  dfs(root, []);
  return result;
}
