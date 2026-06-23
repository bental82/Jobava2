'use client';

// The full repertoire as a collapsible tree (behind a toggle). Carets to
// expand/collapse, indentation by depth, the active move revealed. This is the
// secondary "see everything" view; the next-move chips are the primary nav.

import { useEffect, useMemo, useState } from 'react';
import { walk, type TreeNode } from '@/lib/tree';

interface Props {
  root: TreeNode;
  activeId: string;
  activePath: Set<string>;
  onSelect: (id: string) => void;
}

export default function MoveTree({ root, activeId, activePath, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(activePath));

  const branchCount = useMemo(() => {
    let n = 0;
    walk(root, (node) => {
      if (node.children.length > 0) n += 1;
    });
    return n;
  }, [root]);

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of activePath) next.add(id);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const collapseAll = () => setExpanded(new Set(activePath));

  function rows(nodes: TreeNode[], depth: number): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    for (const node of nodes) {
      const hasKids = node.children.length > 0;
      const isOpen = expanded.has(node.id);
      const isActive = node.id === activeId;
      const onPath = activePath.has(node.id);
      const labelText =
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
            className={`tree-move${isActive ? ' tree-move-active' : ''}`}
            dir="ltr"
            onClick={() => onSelect(node.id)}
          >
            <span className="tree-san">{labelText}</span>
            {hasKids && !isOpen && <span className="tree-count">{node.children.length}</span>}
          </button>
        </div>,
      );
      if (hasKids && isOpen) out.push(...rows(node.children, depth + 1));
    }
    return out;
  }

  return (
    <div className="movetree-card">
      <div className="movetree-head">
        <span className="movetree-title">כל הליינים</span>
        <button
          type="button"
          className="movetree-action"
          onClick={allExpanded ? collapseAll : expandAll}
        >
          {allExpanded ? 'כווץ הכל' : 'הרחב הכל'}
        </button>
      </div>
      <div className="movetree-body">{rows(root.children, 0)}</div>
    </div>
  );
}
