'use client';

// The primary navigator: chips for every move available from the current
// position. Click a chip to play it. The first child (main line) is marked.

import type { TreeNode } from '@/lib/tree';

function label(node: TreeNode): string {
  const num = node.playedBy === 'w' ? `${node.moveNumber}.` : `${node.moveNumber}…`;
  return `${num}${node.san}`;
}

export default function NextMoves({
  node,
  onSelect,
}: {
  node: TreeNode;
  onSelect: (id: string) => void;
}) {
  if (node.children.length === 0) {
    return <p className="nextmoves-end">סוף הליין — חזרו אחורה כדי לבחור וריאציה אחרת.</p>;
  }
  return (
    <div className="nextmoves">
      <span className="nextmoves-label">הצעד הבא:</span>
      <div className="nextmoves-chips" dir="ltr">
        {node.children.map((child, i) => (
          <button
            key={child.id}
            type="button"
            className={`chip${i === 0 ? ' chip-main' : ''}`}
            onClick={() => onSelect(child.id)}
          >
            {label(child)}
          </button>
        ))}
      </div>
    </div>
  );
}
