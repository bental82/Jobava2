'use client';

// Top-level app: a White/Black repertoire toggle, a White- or Black-oriented
// board, next-move chips + breadcrumb as the primary navigation, a concise
// per-move explanation, and the full tree behind a toggle.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TreeNode } from '@/lib/tree';
import type { ExplanationMap } from '@/lib/explanations';
import type { RepId } from '@/lib/repMeta';
import Board from './Board';
import Breadcrumb from './Breadcrumb';
import NextMoves from './NextMoves';
import NodePanel from './NodePanel';
import MoveTree from './MoveTree';
import BigPicture from './BigPicture';
import { GUIDES, classifySituation } from '@/lib/guide';

interface RepertoireData {
  id: RepId;
  label: string;
  orientation: 'white' | 'black';
  root: TreeNode;
  explanations: ExplanationMap;
}

function buildIndex(root: TreeNode) {
  const byId = new Map<string, TreeNode>();
  const parentOf = new Map<string, string>();
  const stack: TreeNode[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    byId.set(n.id, n);
    for (const c of n.children) {
      parentOf.set(c.id, n.id);
      stack.push(c);
    }
  }
  return { byId, parentOf };
}

export default function RepertoireApp({ repertoires }: { repertoires: RepertoireData[] }) {
  const [activeId, setActiveId] = useState<RepId>(repertoires[0].id);
  const [showTree, setShowTree] = useState(false);
  const [currentByRep, setCurrentByRep] = useState<Record<string, string>>(() =>
    Object.fromEntries(repertoires.map((r) => [r.id, r.root.children[0]?.id ?? ''])),
  );

  const rep = repertoires.find((r) => r.id === activeId)!;
  const currentId = currentByRep[activeId] ?? '';
  const setCurrentId = useCallback(
    (id: string) => setCurrentByRep((m) => ({ ...m, [activeId]: id })),
    [activeId],
  );

  const { byId, parentOf } = useMemo(() => buildIndex(rep.root), [rep.root]);
  const current = byId.get(currentId) ?? rep.root;

  const { line, activePath } = useMemo(() => {
    const chain: TreeNode[] = [];
    let id: string | undefined = currentId;
    while (id !== undefined && id !== '') {
      const node = byId.get(id);
      if (!node) break;
      chain.push(node);
      id = parentOf.get(id);
    }
    chain.reverse();
    return { line: chain, activePath: new Set(chain.map((n) => n.id)) };
  }, [currentId, byId, parentOf]);

  const goBack = useCallback(() => {
    const pid = parentOf.get(currentId);
    if (pid !== undefined) setCurrentId(pid);
  }, [currentId, parentOf, setCurrentId]);

  const goForward = useCallback(() => {
    const node = byId.get(currentId);
    if (node && node.children.length > 0) setCurrentId(node.children[0].id);
  }, [currentId, byId, setCurrentId]);

  const cycleSibling = useCallback(
    (dir: 1 | -1) => {
      const pid = parentOf.get(currentId);
      const parent = pid !== undefined ? byId.get(pid) : rep.root;
      if (!parent) return;
      const sibs = parent.children;
      const idx = sibs.findIndex((s) => s.id === currentId);
      if (idx === -1) return;
      setCurrentId(sibs[(idx + dir + sibs.length) % sibs.length].id);
    },
    [currentId, parentOf, byId, rep.root, setCurrentId],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cycleSibling(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); cycleSibling(1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBack, goForward, cycleSibling]);

  const explanation = rep.explanations[currentId] ?? null;
  const situation = useMemo(() => classifySituation(activeId, line), [activeId, line]);
  const canBack = parentOf.has(currentId);
  const canForward = current.children.length > 0;

  return (
    <main className="page">
      <header className="page-header">
        <div className="rep-toggle" role="tablist">
          {repertoires.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={r.id === activeId}
              className={`rep-tab${r.id === activeId ? ' rep-tab-active' : ''}`}
              onClick={() => setActiveId(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="explorer">
        <div className="left-col">
          <Board fen={current.fen} orientation={rep.orientation} />
          <div className="nav-controls" dir="ltr">
            <button type="button" onClick={goBack} disabled={!canBack}>‹ הקודם</button>
            <button type="button" onClick={goForward} disabled={!canForward}>הבא ›</button>
          </div>
          <Breadcrumb line={line} activeId={currentId} onSelect={setCurrentId} onRoot={() => setCurrentId('')} />
          <NextMoves node={current} onSelect={setCurrentId} />
          <button
            type="button"
            className="tree-toggle"
            onClick={() => setShowTree((v) => !v)}
            aria-expanded={showTree}
          >
            {showTree ? '▾ הסתר את כל הליינים' : '▸ הצג את כל הליינים'}
          </button>
          {showTree && (
            <MoveTree root={rep.root} activeId={currentId} activePath={activePath} onSelect={setCurrentId} />
          )}
        </div>

        <div className="right-col">
          <BigPicture guide={GUIDES[activeId]} atOpening={current.ply <= 1} />
          <NodePanel
            node={current}
            sanPath={line.map((n) => n.san ?? '')}
            explanation={explanation}
            situation={situation}
          />
        </div>
      </div>
    </main>
  );
}
