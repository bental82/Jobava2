// Export the whole repertoire tree to PGN files, with each move's rationale
// attached as a PGN comment ({...}). Preserves all variations (RAV). Ready to
// import into Chessbook (or any PGN tool that supports comments + variations).
//
//   npm run export-pgn
//
// Runs Stockfish once for grounding, then writes four variants to data/:
//   repertoire-annotated-he.pgn        Hebrew, with engine evaluation
//   repertoire-annotated-he-clean.pgn  Hebrew, explanation only (no eval line)
//   repertoire-annotated-en.pgn        English, with engine evaluation
//   repertoire-annotated-en-clean.pgn  English, explanation only (no eval line)

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseRepertoire } from '../src/lib/pgn';
import { walk, lineToId, type TreeNode } from '../src/lib/tree';
import { createNodeEngine } from '../src/lib/engineNode';
import type { EngineAnalysis } from '../src/lib/engine';
import { composeRationale, type NodeFacts, type Lang } from './knowledge';

const DATA = join(process.cwd(), 'data');
const SF_DEPTH = parseInt(process.env.SF_DEPTH ?? '13', 10);

function cp(a: EngineAnalysis | null): number | null {
  const l = a?.lines[0];
  if (!l) return null;
  if (l.mateIn !== null) return l.mateIn >= 0 ? 10000 : -10000;
  return l.scoreCp;
}

/** PGN comments are delimited by { }, so braces and newlines must not appear. */
function sanitizeComment(text: string): string {
  return text.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const { root, tags } = parseRepertoire(readFileSync(join(DATA, 'repertoire.pgn'), 'utf8'));

  const parentOf = new Map<string, string>();
  walk(root, (n) => { for (const c of n.children) parentOf.set(c.id, n.id); });

  const nodes: TreeNode[] = [];
  walk(root, (n) => nodes.push(n));

  console.log(`Stockfish grounding (depth ${SF_DEPTH}) for ${nodes.length} positions…`);
  const eng = await createNodeEngine({ depth: SF_DEPTH, multiPv: 3 });
  const aById = new Map<string, EngineAnalysis | null>();
  let i = 0;
  for (const n of nodes) {
    aById.set(n.id, await eng.analyze(n.fen));
    if (++i % 40 === 0 || i === nodes.length) console.log(`  ${i}/${nodes.length}`);
  }
  eng.quit();

  // Build NodeFacts per non-root node.
  const factsById = new Map<string, NodeFacts>();
  for (const n of nodes) {
    if (n.san === null) continue;
    const pid = parentOf.get(n.id);
    const aHere = aById.get(n.id) ?? null;
    const aParent = pid !== undefined ? aById.get(pid) ?? null : null;
    const path = lineToId(root, n.id).map((x) => x.san!);
    factsById.set(n.id, {
      index: 0,
      id: n.id,
      san: n.san,
      path: path.join(' '),
      prevMove: path.length >= 2 ? path[path.length - 2] : null,
      playedBy: n.playedBy!,
      ply: path.length,
      isLeaf: n.children.length === 0,
      evalHereCp: cp(aHere),
      rankAtParent: null,
      bestParentMove: aParent?.lines[0]?.move ?? null,
      bestParentCp: cp(aParent),
    });
  }

  // ---- PGN serialization (preserving variations) ----
  function moveText(node: TreeNode, comment: (id: string) => string): string {
    const number = node.playedBy === 'w' ? `${node.moveNumber}.` : `${node.moveNumber}...`;
    const text = comment(node.id);
    const c = text ? ` {${sanitizeComment(text)}}` : '';
    return `${number} ${node.san}${c}`;
  }
  function childrenText(node: TreeNode, comment: (id: string) => string): string {
    if (node.children.length === 0) return '';
    const [main, ...alts] = node.children;
    const pieces: string[] = [moveText(main, comment)];
    for (const alt of alts) pieces.push(`( ${lineText(alt, comment)} )`);
    const rest = childrenText(main, comment);
    if (rest) pieces.push(rest);
    return pieces.join('\n');
  }
  function lineText(node: TreeNode, comment: (id: string) => string): string {
    const rest = childrenText(node, comment);
    return rest ? `${moveText(node, comment)} ${rest}` : moveText(node, comment);
  }

  function buildPgn(lang: Lang, includeEval: boolean): string {
    const comment = (id: string): string => {
      const facts = factsById.get(id);
      return facts ? composeRationale(facts, { lang, includeEval }) : '';
    };
    const eventBase = (tags.Event as string) || 'Jobava London — White Repertoire';
    const headers = [
      `[Event "${eventBase} (${lang === 'he' ? 'מוער' : 'annotated'})"]`,
      `[Site "chessbook.com"]`,
      `[Date "????.??.??"]`,
      `[White "White Repertoire"]`,
      `[Black "Jobava London"]`,
      `[Result "*"]`,
    ].join('\n');
    return `${headers}\n\n${childrenText(root, comment)} *\n`;
  }

  const variants: { file: string; lang: Lang; includeEval: boolean }[] = [
    { file: 'repertoire-annotated-he.pgn', lang: 'he', includeEval: true },
    { file: 'repertoire-annotated-he-clean.pgn', lang: 'he', includeEval: false },
    { file: 'repertoire-annotated-en.pgn', lang: 'en', includeEval: true },
    { file: 'repertoire-annotated-en-clean.pgn', lang: 'en', includeEval: false },
  ];

  for (const v of variants) {
    writeFileSync(join(DATA, v.file), buildPgn(v.lang, v.includeEval), 'utf8');
    console.log(`Wrote data/${v.file}`);
  }
  console.log(`Done. ${factsById.size} annotated moves per file.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
