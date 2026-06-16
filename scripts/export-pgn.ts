// Export the whole repertoire tree back to a single PGN file, with each move's
// generated Hebrew rationale attached as a PGN comment ({...}). Preserves all
// variations (RAV). The result is ready to import into Chessbook (or any PGN
// tool that supports comments + variations).
//
//   npm run export-pgn
//
// Writes data/repertoire-annotated.pgn.

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseRepertoire } from '../src/lib/pgn';
import type { TreeNode } from '../src/lib/tree';
import type { ExplanationMap } from '../src/lib/explanations';

const DATA = join(process.cwd(), 'data');
const OUT = join(DATA, 'repertoire-annotated.pgn');

const { root, tags } = parseRepertoire(readFileSync(join(DATA, 'repertoire.pgn'), 'utf8'));
const explanations: ExplanationMap = JSON.parse(
  readFileSync(join(DATA, 'explanations.json'), 'utf8'),
);

/** PGN comments are delimited by { }, so braces and newlines must not appear. */
function sanitizeComment(text: string): string {
  return text
    .replace(/[{}]/g, '') // braces would close/confuse the comment
    .replace(/\s+/g, ' ') // collapse newlines/tabs into single spaces
    .trim();
}

/** "1. d4 {…}" for White, "1... d5 {…}" for Black. */
function moveText(node: TreeNode): string {
  const number = node.playedBy === 'w' ? `${node.moveNumber}.` : `${node.moveNumber}...`;
  const rationale = explanations[node.id]?.rationale;
  const comment = rationale ? ` {${sanitizeComment(rationale)}}` : '';
  return `${number} ${node.san}${comment}`;
}

// children[0] is the main line; children[1..] are alternatives (variations)
// branching from the same position, written in parentheses after the main move.
function childrenText(node: TreeNode): string {
  if (node.children.length === 0) return '';
  const [main, ...alts] = node.children;
  const pieces: string[] = [moveText(main)];
  for (const alt of alts) {
    pieces.push(`( ${lineText(alt)} )`);
  }
  const rest = childrenText(main);
  if (rest) pieces.push(rest);
  return pieces.join('\n');
}

function lineText(node: TreeNode): string {
  const rest = childrenText(node);
  return rest ? `${moveText(node)} ${rest}` : moveText(node);
}

const headers = [
  `[Event "${(tags.Event as string) || 'Jobava London — White Repertoire (annotated)'}"]`,
  `[Site "chessbook.com"]`,
  `[Date "????.??.??"]`,
  `[White "White Repertoire"]`,
  `[Black "Jobava London"]`,
  `[Result "*"]`,
].join('\n');

const movetext = childrenText(root);
const pgn = `${headers}\n\n${movetext} *\n`;

writeFileSync(OUT, pgn, 'utf8');

// Report stats.
let moves = 0;
let commented = 0;
(function count(n: TreeNode) {
  if (n.san !== null) {
    moves += 1;
    if (explanations[n.id]?.rationale) commented += 1;
  }
  n.children.forEach(count);
})(root);

console.log(`Wrote ${OUT}`);
console.log(`Moves: ${moves}  |  with explanation comments: ${commented}`);
