'use client';

// Top-level interactive explorer: board + variation tree + node panel, with
// back/forward and keyboard navigation. The tree and explanation cache are
// loaded server-side and passed in as props.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TreeNode } from '@/lib/tree';
import type { ExplanationMap } from '@/lib/explanations';
import Board from './Board';
import VariationTree from './VariationTree';
import NodePanel from './NodePanel';

interface Props {
  root: TreeNode;
  explanations: ExplanationMap;
}

interface Indexed {
  byId: Map<string, TreeNode>;
  parentOf: Map<string, string>; // childId -> parentId
}

function buildIndex(root: TreeNode): Indexed {
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

export default function Explorer({ root, explanations }: Props) {
  // Start on the first real move (1.d4) if present, else the root.
  const firstMoveId = root.children[0]?.id ?? '';
  const [currentId, setCurrentId] = useState(firstMoveId);

  const { byId, parentOf } = useMemo(() => buildIndex(root), [root]);

  const current = byId.get(currentId) ?? root;

  // The active line (root-exclusive) down to the current node, for breadcrumb
  // and path highlighting.
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
  }, [currentId, parentOf]);

  const goForward = useCallback(() => {
    const node = byId.get(currentId);
    if (node && node.children.length > 0) setCurrentId(node.children[0].id);
  }, [currentId, byId]);

  // Up/Down cycles between sibling alternatives at the same parent.
  const cycleSibling = useCallback(
    (dir: 1 | -1) => {
      const pid = parentOf.get(currentId);
      const parent = pid !== undefined ? byId.get(pid) : root;
      if (!parent) return;
      const sibs = parent.children;
      const idx = sibs.findIndex((s) => s.id === currentId);
      if (idx === -1) return;
      const next = sibs[(idx + dir + sibs.length) % sibs.length];
      setCurrentId(next.id);
    },
    [currentId, parentOf, byId, root],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't hijack typing in the Ask box.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      // RTL page: Left/Right keep their natural "previous/next in line" sense.
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cycleSibling(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        cycleSibling(1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBack, goForward, cycleSibling]);

  const explanation = explanations[currentId] ?? null;
  const canBack = parentOf.has(currentId);
  const canForward = current.children.length > 0;

  return (
    <div className="explorer">
      <div className="left-col">
        <Board fen={current.fen} />
        <div className="nav-controls" dir="ltr">
          <button type="button" onClick={goBack} disabled={!canBack} aria-label="הקודם">
            ‹ הקודם
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={!canForward}
            aria-label="הבא"
          >
            הבא ›
          </button>
        </div>
        <p className="nav-hint">חיצי ימינה/שמאלה: קדימה/אחורה · למעלה/למטה: מעבר בין וריאציות</p>
        <div className="tree-wrap">
          <VariationTree
            root={root}
            activeId={currentId}
            activePath={activePath}
            onSelect={setCurrentId}
          />
        </div>
      </div>
      <div className="right-col">
        <NodePanel node={current} line={line} explanation={explanation} />
      </div>
    </div>
  );
}
