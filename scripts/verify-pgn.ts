// One-off verification that the parser preserves ALL variations from the PGN.
//
// Strategy:
//  1. Independently count SAN move tokens in the raw PGN text (ignoring move
//     numbers, parentheses, comments, NAGs, result) — this is the ground truth
//     for "how many moves are in the file".
//  2. Parse into our tree and count nodes.
//  3. Assert the two counts match.
//  4. Spot-check that specific deep variations survive end-to-end.
//
// Run: npm run verify-pgn

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseRepertoire } from '../src/lib/pgn';
import { countMoves, findById, walk } from '../src/lib/tree';

const pgnPath = join(process.cwd(), 'data', 'repertoire.pgn');
const pgnText = readFileSync(pgnPath, 'utf8');

// --- 1. Independent SAN token count from the raw text -----------------------
// Strip the tag section (lines in [ ]) and the trailing result.
const movetext = pgnText
  .split('\n')
  .filter((line) => !line.trim().startsWith('['))
  .join(' ');

const SAN = /^([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQK])?|O-O(-O)?)[+#]?$/;

const tokens = movetext
  // turn parentheses into spaces so "(1..." splits cleanly
  .replace(/[()]/g, ' ')
  // drop NAGs like $1
  .replace(/\$\d+/g, ' ')
  .split(/\s+/)
  .map((t) => t.trim())
  .filter((t) => t.length > 0);

const sanTokens = tokens.filter((t) => SAN.test(t));
const rawSanCount = sanTokens.length;

// --- 2. Parse + count -------------------------------------------------------
const { root, tags } = parseRepertoire(pgnText);
const treeMoveCount = countMoves(root);

// --- 3. Tree shape stats ----------------------------------------------------
let maxDepth = 0;
let leaves = 0;
let branchPoints = 0;
walk(root, (node) => {
  maxDepth = Math.max(maxDepth, node.ply);
  if (node.children.length === 0) leaves += 1;
  if (node.children.length > 1) branchPoints += 1;
});

console.log('=== PGN parse verification ===');
console.log('Event tag           :', tags.Event ?? '(none)');
console.log('Raw SAN token count :', rawSanCount);
console.log('Tree move count     :', treeMoveCount);
console.log('Max depth (plies)   :', maxDepth);
console.log('Leaf lines          :', leaves);
console.log('Branch points (>1)  :', branchPoints);

// --- 4. Spot-check deep variations survive ----------------------------------
const expectedLines: string[][] = [
  // Main line into the Nb5 jump and the e5/dxe5/Nxe5/Bxe5 tabiya
  ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'Nc6', 'Nb5', 'e5', 'dxe5', 'Nxe5', 'Bxe5'],
  // The deepest tactical sub-variation: ...Ne4 Qxd5 Qxd5 Nxc7+
  ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'Nc6', 'Nb5', 'e5', 'dxe5', 'Ne4', 'Qxd5', 'Qxd5', 'Nxc7+'],
  // 1...e5 gambit line
  ['d4', 'e5', 'dxe5', 'Bc5', 'Nf3', 'd6', 'exd6', 'Ne7', 'Nc3'],
  // 1...e6 transposition with Bb4 pin and a3
  ['d4', 'e6', 'Nc3', 'd5', 'Bf4', 'Bb4', 'e3', 'Nf6', 'Ne2', 'Ne4', 'a3'],
  // KID-style 1...Nf6 2...g6 with e4-e5
  ['d4', 'Nf6', 'Nc3', 'g6', 'e4', 'Bg7', 'e5'],
  // ...Bf5 with f3/g4/h4 plan
  ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'Bf5', 'f3', 'e6', 'g4', 'Bg6', 'h4'],
];

let allOk = true;
for (const line of expectedLines) {
  const id = line.join(' ');
  const node = findById(root, id);
  const ok = node !== null;
  if (!ok) allOk = false;
  console.log(`${ok ? 'OK ' : 'MISSING'}  ${id}`);
}

console.log('==============================');
if (rawSanCount !== treeMoveCount) {
  console.error(
    `FAIL: move count mismatch (raw ${rawSanCount} vs tree ${treeMoveCount}).`,
  );
  process.exit(1);
}
if (!allOk) {
  console.error('FAIL: one or more expected variations missing.');
  process.exit(1);
}
console.log('PASS: all moves accounted for and deep variations preserved.');
