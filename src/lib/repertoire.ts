// Server-side loader: reads the PGN + explanation cache from disk and builds
// the tree once. Used by the page (Server Component) and the scripts.

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseRepertoire } from './pgn';
import type { TreeNode } from './tree';
import type { ExplanationMap } from './explanations';

const DATA_DIR = join(process.cwd(), 'data');
const PGN_PATH = join(DATA_DIR, 'repertoire.pgn');
const EXPLANATIONS_PATH = join(DATA_DIR, 'explanations.json');

export function loadRepertoireTree(): { root: TreeNode; tags: Record<string, unknown> } {
  const pgnText = readFileSync(PGN_PATH, 'utf8');
  return parseRepertoire(pgnText);
}

export function loadExplanations(): ExplanationMap {
  if (!existsSync(EXPLANATIONS_PATH)) return {};
  try {
    const raw = readFileSync(EXPLANATIONS_PATH, 'utf8');
    return JSON.parse(raw) as ExplanationMap;
  } catch {
    return {};
  }
}
