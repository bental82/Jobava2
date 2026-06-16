'use client';

// Right-hand panel for the current node:
//  (1) move in SAN (with the line leading to it)
//  (2) original PGN annotation, if any
//  (3) the generated Hebrew rationale
//  (4) engine seam (eval bar + top lines) — dormant until Stockfish is wired
// Plus an optional "Ask about this position" box (server-side Claude).

import type { TreeNode } from '@/lib/tree';
import type { Explanation } from '@/lib/explanations';
import AskBox from './AskBox';
import EnginePanel from './EnginePanel';

interface Props {
  node: TreeNode;
  line: TreeNode[];
  explanation: Explanation | null;
}

function formatLine(line: TreeNode[]): string {
  const parts: string[] = [];
  for (const n of line) {
    if (n.playedBy === 'w') parts.push(`${n.moveNumber}.${n.san}`);
    else parts.push(n.san ?? '');
  }
  return parts.join(' ');
}

export default function NodePanel({ node, line, explanation }: Props) {
  const isRoot = node.san === null;
  const sideToMove = node.turn === 'w' ? 'הלבן' : 'השחור';

  return (
    <div className="node-panel">
      <section className="panel-section">
        <h2 className="panel-heading">המהלך</h2>
        {isRoot ? (
          <p className="san-big">עמדת הפתיחה</p>
        ) : (
          <>
            <p className="san-big" dir="ltr">
              {node.moveNumber}
              {node.playedBy === 'w' ? '.' : '…'} {node.san}
            </p>
            <p className="line-context" dir="ltr">
              {formatLine(line)}
            </p>
          </>
        )}
        <p className="to-move">תורו של {sideToMove} לשחק.</p>
      </section>

      {node.comment && (
        <section className="panel-section">
          <h2 className="panel-heading">ההערה המקורית שלי</h2>
          <p className="original-annotation">{node.comment}</p>
        </section>
      )}

      <section className="panel-section">
        <h2 className="panel-heading">ההיגיון מאחורי המהלך</h2>
        {explanation ? (
          <p className="rationale">{explanation.rationale}</p>
        ) : (
          <p className="rationale rationale-missing">
            עדיין לא הופק הסבר למהלך זה. הריצו <code dir="ltr">npm run enrich</code>{' '}
            כדי לייצר הסברים, או בחרו מהלך אחר.
          </p>
        )}
        {explanation && (
          <p className="rationale-meta" dir="ltr">
            {explanation.model}
          </p>
        )}
      </section>

      <EnginePanel fen={node.fen} />

      <AskBox fen={node.fen} sanPath={line.map((n) => n.san ?? '')} />
    </div>
  );
}
