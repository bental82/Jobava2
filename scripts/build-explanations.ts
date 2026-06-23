// Offline explanation generator (NO external API, NO engine).
//
// Walks each repertoire tree and writes ONE concise Hebrew sentence per move
// (from scripts/knowledge.ts) describing what the move tries to do in the
// opening. Deterministic, instant, safe to re-run.
//
//   npm run build-explanations
//
// Writes data/explanations.json (white) and data/black-explanations.json.

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseRepertoire } from '../src/lib/pgn';
import { walk, type TreeNode } from '../src/lib/tree';
import type { ExplanationMap } from '../src/lib/explanations';
import { explainMove, type RepId } from './knowledge';

const DATA = join(process.cwd(), 'data');

const REPS: { id: RepId; pgn: string; out: string }[] = [
  { id: 'white', pgn: 'repertoire.pgn', out: 'explanations.json' },
  { id: 'black', pgn: 'black-repertoire.pgn', out: 'black-explanations.json' },
];

/** Small dependency-free FNV-1a hash so re-generation is stable per content. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

for (const rep of REPS) {
  const { root } = parseRepertoire(readFileSync(join(DATA, rep.pgn), 'utf8'));
  const out: ExplanationMap = {};
  const nodes: TreeNode[] = [];
  walk(root, (n) => nodes.push(n));
  for (const n of nodes) {
    if (n.san === null) continue;
    const rationale = explainMove(rep.id, n);
    out[n.id] = {
      key: n.id,
      san: n.san,
      rationale,
      model: 'curated-kb',
      inputHash: hash(rationale),
      generatedAt: new Date().toISOString(),
    };
  }
  const sorted: ExplanationMap = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  writeFileSync(join(DATA, rep.out), JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`${rep.id}: wrote ${Object.keys(out).length} explanations to data/${rep.out}`);
}
