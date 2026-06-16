// One-time / incremental enrichment.
//
// Walks the ENTIRE repertoire tree and produces a Hebrew rationale for every
// node, cached to data/explanations.json keyed by move-path. Re-running only
// calls the model for new or changed nodes (cache-by-content-hash), so it's
// cheap to re-run after editing the PGN.
//
// Usage:
//   ANTHROPIC_API_KEY=... npm run enrich
//   ENRICH_MODEL=claude-opus-4-8 npm run enrich     # stronger model override
//   npm run enrich -- --dry-run                     # plan only, no API calls
//   npm run enrich -- --limit 20                    # cap number of API calls
//
// The deployed app NEVER calls the API — it just reads the committed JSON.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { parseRepertoire } from '../src/lib/pgn';
import { walk, lineToId, type TreeNode } from '../src/lib/tree';
import {
  explanationInputHash,
  type Explanation,
  type ExplanationMap,
} from '../src/lib/explanations';
import { buildUserPrompt, SYSTEM_PROMPT, type NodeContext } from '../src/lib/prompt';
import { nullEngine, summarizeEngine } from '../src/lib/engine';

// ---- tiny dependency-free .env loader (so `npm run enrich` finds the key) ----
function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), '.env.local'));
loadEnvFile(join(process.cwd(), '.env'));

// ---- args ----
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1] ?? '0', 10) : Infinity;
const CONCURRENCY = 4;

const MODEL = process.env.ENRICH_MODEL ?? 'claude-sonnet-4-6';

const DATA_DIR = join(process.cwd(), 'data');
const PGN_PATH = join(DATA_DIR, 'repertoire.pgn');
const OUT_PATH = join(DATA_DIR, 'explanations.json');

// ---- load tree + existing cache ----
const pgnText = readFileSync(PGN_PATH, 'utf8');
const { root } = parseRepertoire(pgnText);

const cache: ExplanationMap = existsSync(OUT_PATH)
  ? (JSON.parse(readFileSync(OUT_PATH, 'utf8')) as ExplanationMap)
  : {};

// ---- engine summary (currently disabled — nullEngine returns null) ----
async function engineSummaryFor(fen: string): Promise<string | null> {
  const analysis = await nullEngine.analyze(fen);
  return summarizeEngine(analysis);
}

// ---- collect nodes needing work ----
interface Job {
  node: TreeNode;
  ctx: NodeContext;
  inputHash: string;
}

async function planJobs(): Promise<Job[]> {
  const jobs: Job[] = [];
  const nodes: TreeNode[] = [];
  walk(root, (n) => {
    if (n.san !== null) nodes.push(n);
  });

  for (const node of nodes) {
    const engineSummary = await engineSummaryFor(node.fen);
    const inputHash = explanationInputHash({
      key: node.id,
      fen: node.fen,
      comment: node.comment,
      nags: node.nags,
      engineSummary,
    });
    const existing = cache[node.id];
    if (existing && existing.inputHash === inputHash && existing.model === MODEL) {
      continue; // up to date
    }
    const sanPath = lineToId(root, node.id).map((n) => n.san!);
    const ctx: NodeContext = {
      sanPath,
      movePlayed: node.san,
      fen: node.fen,
      turnToMove: node.turn,
      playedBy: node.playedBy,
      comment: node.comment,
      nags: node.nags,
      engineSummary,
    };
    jobs.push({ node, ctx, inputHash });
  }
  return jobs;
}

// ---- run ----
async function generate(client: Anthropic, job: Job): Promise<Explanation> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(job.ctx) }],
  });
  const rationale = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return {
    key: job.node.id,
    san: job.node.san,
    rationale,
    model: MODEL,
    inputHash: job.inputHash,
    generatedAt: new Date().toISOString(),
  };
}

function saveCache() {
  // Sort keys for stable, review-friendly diffs.
  const sorted: ExplanationMap = {};
  for (const k of Object.keys(cache).sort()) sorted[k] = cache[k];
  writeFileSync(OUT_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

async function main() {
  const allJobs = await planJobs();
  const jobs = allJobs.slice(0, LIMIT === Infinity ? allJobs.length : LIMIT);

  console.log(`Model            : ${MODEL}`);
  console.log(`Nodes needing work: ${allJobs.length}`);
  console.log(`Will process      : ${jobs.length}${DRY_RUN ? ' (dry run)' : ''}`);

  if (DRY_RUN) {
    for (const j of jobs.slice(0, 10)) {
      console.log(`  - ${j.node.id}`);
    }
    if (jobs.length > 10) console.log(`  … and ${jobs.length - 10} more`);
    return;
  }
  if (jobs.length === 0) {
    console.log('Nothing to do — cache is up to date.');
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY is not set. Add it to .env.local.');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });

  let done = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        const result = await generate(client, job);
        cache[job.node.id] = result;
        done++;
        if (done % 10 === 0 || done === jobs.length) {
          console.log(`  ${done}/${jobs.length} done`);
          saveCache(); // checkpoint so a crash doesn't lose progress
        }
      } catch (err) {
        failed++;
        const m = err instanceof Error ? err.message : String(err);
        console.error(`  FAILED ${job.node.id}: ${m}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()),
  );

  saveCache();
  console.log(`Finished. Generated ${done}, failed ${failed}. Wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
