// Export each repertoire tree to a PGN file, with the concise Hebrew rationale
// attached as a {comment} on every move. Preserves all variations (RAV).
// Ready to import into Chessbook.
//
//   npm run export-pgn
//
// Writes data/repertoire-annotated-he.pgn (white) and
// data/black-annotated-he.pgn (black).

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseRepertoire } from '../src/lib/pgn';
import type { TreeNode } from '../src/lib/tree';
import { explainMove, type RepId } from './knowledge';

const DATA = join(process.cwd(), 'data');

const REPS: { id: RepId; pgn: string; out: string; event: string }[] = [
  { id: 'white', pgn: 'repertoire.pgn', out: 'repertoire-annotated-he.pgn', event: 'Jobava London — White Repertoire' },
  { id: 'black', pgn: 'black-repertoire.pgn', out: 'black-annotated-he.pgn', event: 'Caro-Kann / Slav — Black Repertoire' },
];

/** PGN comments are delimited by { }, so braces and newlines must not appear. */
function sanitize(text: string): string {
  return text.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

for (const rep of REPS) {
  const { root } = parseRepertoire(readFileSync(join(DATA, rep.pgn), 'utf8'));

  const moveText = (node: TreeNode): string => {
    const number = node.playedBy === 'w' ? `${node.moveNumber}.` : `${node.moveNumber}...`;
    const text = sanitize(explainMove(rep.id, node));
    const comment = text ? ` {${text}}` : '';
    return `${number} ${node.san}${comment}`;
  };
  const childrenText = (node: TreeNode): string => {
    if (node.children.length === 0) return '';
    const [main, ...alts] = node.children;
    const pieces: string[] = [moveText(main)];
    for (const alt of alts) pieces.push(`( ${lineText(alt)} )`);
    const rest = childrenText(main);
    if (rest) pieces.push(rest);
    return pieces.join('\n');
  };
  const lineText = (node: TreeNode): string => {
    const rest = childrenText(node);
    return rest ? `${moveText(node)} ${rest}` : moveText(node);
  };

  const headers = [
    `[Event "${rep.event} (מוער)"]`,
    `[Site "chessbook.com"]`,
    `[Date "????.??.??"]`,
    `[Result "*"]`,
  ].join('\n');
  const pgn = `${headers}\n\n${childrenText(root)} *\n`;
  writeFileSync(join(DATA, rep.out), pgn, 'utf8');
  console.log(`${rep.id}: wrote data/${rep.out}`);
}
