'use client';

// Renders the repertoire as a clickable PGN-style movetext tree (NOT a flat
// list). The first child of each node is the main line; further children are
// variations, shown as indented bracketed blocks — mirroring how the PGN reads.

import { Fragment } from 'react';
import type { TreeNode } from '@/lib/tree';

interface Props {
  root: TreeNode;
  activeId: string;
  activePath: Set<string>;
  onSelect: (id: string) => void;
}

function MoveToken({
  node,
  showBlackNumber,
  active,
  onPath,
  onSelect,
}: {
  node: TreeNode;
  showBlackNumber: boolean;
  active: boolean;
  onPath: boolean;
  onSelect: (id: string) => void;
}) {
  const isWhite = node.playedBy === 'w';
  const number = isWhite
    ? `${node.moveNumber}.`
    : showBlackNumber
      ? `${node.moveNumber}…`
      : '';

  const cls = [
    'move-token',
    active ? 'move-active' : '',
    !active && onPath ? 'move-onpath' : '',
    node.nags.length ? 'move-nag' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cls}
      onClick={() => onSelect(node.id)}
      title={node.comment ?? undefined}
    >
      {number && <span className="move-number">{number}</span>}
      <span className="move-san">{node.san}</span>
    </button>
  );
}

/**
 * Render everything that follows `node` — i.e. its children. children[0] is the
 * main continuation; children[1..] are variations branching from `node`,
 * rendered as bracketed indented blocks after the main move.
 *
 * `blackNeedsNumber`: when the main child is a Black move and we just emerged
 * from a variation/line start, we re-show the "N…" number for clarity.
 */
function Continuation({
  node,
  blackNeedsNumber,
  activeId,
  activePath,
  onSelect,
}: {
  node: TreeNode;
  blackNeedsNumber: boolean;
  activeId: string;
  activePath: Set<string>;
  onSelect: (id: string) => void;
}) {
  if (node.children.length === 0) return null;
  const [main, ...alts] = node.children;

  return (
    <>
      <MoveToken
        node={main}
        showBlackNumber={blackNeedsNumber}
        active={main.id === activeId}
        onPath={activePath.has(main.id)}
        onSelect={onSelect}
      />
      {alts.map((alt) => (
        <span className="variation" key={alt.id}>
          {'('}
          <LineStart
            node={alt}
            activeId={activeId}
            activePath={activePath}
            onSelect={onSelect}
          />
          {')'}
        </span>
      ))}
      <Continuation
        node={main}
        // After brackets, a following Black main move should re-show its number.
        blackNeedsNumber={alts.length > 0}
        activeId={activeId}
        activePath={activePath}
        onSelect={onSelect}
      />
    </>
  );
}

/** Render a variation line: its first move (with number) then its continuation. */
function LineStart({
  node,
  activeId,
  activePath,
  onSelect,
}: {
  node: TreeNode;
  activeId: string;
  activePath: Set<string>;
  onSelect: (id: string) => void;
}) {
  return (
    <Fragment>
      <MoveToken
        node={node}
        showBlackNumber
        active={node.id === activeId}
        onPath={activePath.has(node.id)}
        onSelect={onSelect}
      />
      <Continuation
        node={node}
        blackNeedsNumber={false}
        activeId={activeId}
        activePath={activePath}
        onSelect={onSelect}
      />
    </Fragment>
  );
}

export default function VariationTree({ root, activeId, activePath, onSelect }: Props) {
  return (
    <div className="variation-tree" dir="ltr">
      <Continuation
        node={root}
        blackNeedsNumber={false}
        activeId={activeId}
        activePath={activePath}
        onSelect={onSelect}
      />
    </div>
  );
}
