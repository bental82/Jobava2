'use client';

// "Lines menu": an ordered index of every complete line in the repertoire,
// exactly as they appear in the PGN (DFS order), grouped by Black's first move.
// Clicking a line jumps to its final position; the tree highlights the path.
// This keeps the variations in a clear, navigable order alongside the tree.

import { useMemo, useState } from 'react';
import { collectLines, type TreeNode } from '@/lib/tree';

interface Props {
  root: TreeNode;
  activeId: string;
  onSelect: (id: string) => void;
}

function lineLabel(line: TreeNode[]): string {
  const parts: string[] = [];
  for (const n of line) {
    if (n.playedBy === 'w') parts.push(`${n.moveNumber}.${n.san}`);
    else parts.push(n.san ?? '');
  }
  return parts.join(' ');
}

export default function LinesMenu({ root, activeId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => {
    const lines = collectLines(root);
    // Group by Black's first move (line[1]) for a readable index.
    const map = new Map<string, TreeNode[][]>();
    for (const line of lines) {
      const key = line[1]?.san ? `1...${line[1].san}` : `1.${line[0]?.san}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(line);
    }
    return [...map.entries()];
  }, [root]);

  const total = useMemo(() => collectLines(root).length, [root]);

  return (
    <div className="lines-menu">
      <button
        type="button"
        className="lines-menu-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? '▾' : '▸'} תפריט ליינים ({total})
      </button>
      {open && (
        <div className="lines-menu-body">
          {groups.map(([group, lines]) => (
            <div className="lines-group" key={group}>
              <div className="lines-group-title" dir="ltr">
                {group}
              </div>
              <ul className="lines-list">
                {lines.map((line) => {
                  const leaf = line[line.length - 1];
                  const onActive = leaf.id === activeId || activeId.startsWith(leaf.id);
                  const isActivePath = activeId === leaf.id;
                  return (
                    <li key={leaf.id}>
                      <button
                        type="button"
                        className={`line-entry${isActivePath ? ' line-entry-active' : ''}`}
                        dir="ltr"
                        onClick={() => onSelect(leaf.id)}
                      >
                        {lineLabel(line)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
