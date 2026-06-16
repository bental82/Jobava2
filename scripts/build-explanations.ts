// Offline explanation generator (NO external API).
//
// Walks the whole PGN tree, runs single-threaded Stockfish locally for grounding
// (eval + whether the move was the engine's top pick), then composes a Hebrew
// rationale per node from the curated Jobava knowledge base. Writes the result
// to data/explanations.json — the same cache the app reads.
//
// Use this when you don't have / don't want to spend an ANTHROPIC_API_KEY:
//   npm run build-explanations
// It is deterministic and safe to re-run (e.g. after editing the PGN).

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseRepertoire } from '../src/lib/pgn';
import { walk, lineToId, type TreeNode } from '../src/lib/tree';
import { explanationInputHash, type ExplanationMap } from '../src/lib/explanations';
import { buildEngineNote } from '../src/lib/prompt';
import { createNodeEngine } from '../src/lib/engineNode';
import type { EngineAnalysis } from '../src/lib/engine';
import { composeRationale, computeQuality, type NodeFacts } from './knowledge';

const SF_DEPTH = parseInt(process.env.SF_DEPTH ?? '13', 10);
const OUT_PATH = join(process.cwd(), 'data', 'explanations.json');

function cp(a: EngineAnalysis | null): number | null {
  const l = a?.lines[0];
  if (!l) return null;
  if (l.mateIn !== null) return l.mateIn >= 0 ? 10000 : -10000;
  return l.scoreCp;
}

async function main() {
  const { root } = parseRepertoire(readFileSync(join(process.cwd(), 'data', 'repertoire.pgn'), 'utf8'));
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

  const out: ExplanationMap = {};
  for (const n of nodes) {
    if (n.san === null) continue;
    const pid = parentOf.get(n.id);
    const aHere = aById.get(n.id) ?? null;
    const aParent = pid !== undefined ? aById.get(pid) ?? null : null;
    let rank: number | null = null;
    if (aParent && aParent.lines.length) {
      const r = aParent.lines.findIndex((l) => l.move === n.san);
      rank = r === -1 ? -1 : r + 1;
    }
    const path = lineToId(root, n.id).map((x) => x.san!);
    const facts: NodeFacts = {
      index: 0,
      id: n.id,
      san: n.san,
      path: path.join(' '),
      prevMove: path.length >= 2 ? path[path.length - 2] : null,
      playedBy: n.playedBy!,
      ply: path.length,
      isLeaf: n.children.length === 0,
      evalHereCp: cp(aHere),
      rankAtParent: rank,
      bestParentMove: aParent?.lines[0]?.move ?? null,
      bestParentCp: cp(aParent),
    };
    const engineNote = buildEngineNote({ san: n.san, analysisHere: aHere, analysisParent: aParent });
    out[n.id] = {
      key: n.id,
      san: n.san,
      rationale: composeRationale(facts),
      quality: computeQuality(facts),
      model: 'curated-kb (jobava) + stockfish-grounding',
      inputHash: explanationInputHash({ key: n.id, fen: n.fen, comment: n.comment, nags: n.nags, engineSummary: engineNote }),
      generatedAt: new Date().toISOString(),
    };
  }

  const sorted: ExplanationMap = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  writeFileSync(OUT_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${Object.keys(out).length} explanations to ${OUT_PATH}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
