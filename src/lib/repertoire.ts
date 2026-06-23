// Server-side loader: reads each repertoire's PGN + explanation cache from disk
// and builds the trees once. Used by the page (Server Component).

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseRepertoire } from './pgn';
import type { TreeNode } from './tree';
import type { ExplanationMap } from './explanations';
import { REP_META, type RepId } from './repMeta';

const DATA_DIR = join(process.cwd(), 'data');

const FILES: Record<RepId, { pgn: string; explanations: string }> = {
  white: { pgn: 'repertoire.pgn', explanations: 'explanations.json' },
  black: { pgn: 'black-repertoire.pgn', explanations: 'black-explanations.json' },
};

export interface RepertoireData {
  id: RepId;
  label: string;
  orientation: 'white' | 'black';
  root: TreeNode;
  explanations: ExplanationMap;
}

function loadExplanations(file: string): ExplanationMap {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ExplanationMap;
  } catch {
    return {};
  }
}

export function loadAllRepertoires(): RepertoireData[] {
  return REP_META.map((meta) => {
    const files = FILES[meta.id];
    const { root } = parseRepertoire(readFileSync(join(DATA_DIR, files.pgn), 'utf8'));
    return {
      id: meta.id,
      label: meta.label,
      orientation: meta.orientation,
      root,
      explanations: loadExplanations(files.explanations),
    };
  });
}
