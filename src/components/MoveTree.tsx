'use client';

// The repertoire as an interactive, collapsible TREE (file-explorer style):
// carets to expand/collapse, indentation by depth, the active move revealed and
// scrolled into view, and small color dots flagging dubious/blunder moves.
// This is the single primary navigator — click any move to jump the board.

import { useEffect, useMemo, useRef, useState } from 'react';
import { walk, type TreeNode } from '@/lib/tree';
import type { ExplanationMap } from '@/lib/explanations';

interface Props {
  root: TreeNode;
  activeId: string;
  activePath: Set<string>;
  explanations: ExplanationMap;
  onSelect: (id: string) => void;
}

const DOT_COLOR: Record<string, string> = {
  dubious: '#f59e0b',
  blunder: '#dc2626',
};

export default function MoveTree({
  root,
  activeId,
  activePath,
  explanations,
  onSelect,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(activePath));
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const branchCount = useMemo(() => {
    let n = 0;
    walk(root, (node) => {
      if (node.children.length > 0) n += 1;
    });
    return n;
  }, [root]);

  // Reveal (expand the path to) the active node whenever it changes.
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of activePath) next.add(id);
      return next;
    });
    // activePath is derived from activeId; depending on activeId avoids
    // re-running on every render (activePath is a fresh Set each time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Keep the active row in view as you navigate by keyboard/board.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allExpanded = expanded.size >= branchCount;
  const expandAll = () => {
    const all = new Set<string>();
    walk(root, (node) => {
      if (node.children.length > 0) all.add(node.id);
    });
    setExpanded(all);
  };
  // Collapse, but keep the path to the current move visible.
  const collapseAll = () => setExpanded(new Set(activePath));

  function renderRows(nodes: TreeNode[], depth: number): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    for (const node of nodes) {
      const hasKids = node.children.length > 0;
      const isOpen = expanded.has(node.id);
      const isActive = node.id === activeId;
      const onPath = activePath.has(node.id);
      const quality = explanations[node.id]?.quality;
      const label =
        node.playedBy === 'w' ? `${node.moveNumber}.${node.san}` : node.san ?? '';

      out.push(
        <div
          key={node.id}
          className={`tree-row${onPath ? ' tree-row-onpath' : ''}`}
          style={{ paddingInlineStart: depth * 15 + 4 }}
        >
          {hasKids ? (
            <button
              type="button"
              className="tree-caret"
              onClick={() => toggle(node.id)}
              aria-label={isOpen ? 'כווץ' : 'הרחב'}
            >
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="tree-caret tree-caret-leaf" />
          )}
          <button
            type="button"
            ref={isActive ? activeRef : undefined}
            className={`tree-move${isActive ? ' tree-move-active' : ''}`}
            dir="ltr"
            onClick={() => onSelect(node.id)}
          >
            <span className="tree-san">{label}</span>
            {quality && quality !== 'good' && (
              <span
                className="tree-dot"
                style={{ background: DOT_COLOR[quality] }}
                title={quality === 'blunder' ? 'טעות' : 'לא מדויק'}
              />
            )}
            {hasKids && !isOpen && <span className="tree-count">{node.children.length}</span>}
          </button>
        </div>,
      );

      if (hasKids && isOpen) out.push(...renderRows(node.children, depth + 1));
    }
    return out;
  }

  return (
    <div className="movetree-card">
      <div className="movetree-head">
        <span className="movetree-title">עץ הרפרטואר</span>
        <button
          type="button"
          className="movetree-action"
          onClick={allExpanded ? collapseAll : expandAll}
        >
          {allExpanded ? 'כווץ הכל' : 'הרחב הכל'}
        </button>
      </div>
      <div className="movetree-body">{renderRows(root.children, 0)}</div>
    </div>
  );
}
