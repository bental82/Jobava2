'use client';

// The current line as a compact, clickable breadcrumb. Click any move to jump
// back to it; click "התחלה" for the starting position.

import type { TreeNode } from '@/lib/tree';

function label(node: TreeNode): string {
  const num = node.playedBy === 'w' ? `${node.moveNumber}.` : `${node.moveNumber}…`;
  return `${num}${node.san}`;
}

export default function Breadcrumb({
  line,
  activeId,
  onSelect,
  onRoot,
}: {
  line: TreeNode[];
  activeId: string;
  onSelect: (id: string) => void;
  onRoot: () => void;
}) {
  return (
    <div className="breadcrumb" dir="ltr">
      <button
        type="button"
        className={`crumb${activeId === '' ? ' crumb-active' : ''}`}
        onClick={onRoot}
      >
        ⌂
      </button>
      {line.map((node) => (
        <button
          key={node.id}
          type="button"
          className={`crumb${node.id === activeId ? ' crumb-active' : ''}`}
          onClick={() => onSelect(node.id)}
        >
          {label(node)}
        </button>
      ))}
    </div>
  );
}
