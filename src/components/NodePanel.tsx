'use client';

// Right-hand panel for the current node. Leads with the move + a quality badge
// and the rationale (the primary content), then the original annotation if any,
// then the secondary tools (engine eval, ask box).

import type { TreeNode } from '@/lib/tree';
import type { Explanation } from '@/lib/explanations';
import AskBox from './AskBox';
import EnginePanel from './EnginePanel';

interface Props {
  node: TreeNode;
  line: TreeNode[];
  explanation: Explanation | null;
}

const QUALITY_LABEL: Record<string, string> = {
  good: 'מהלך תקין',
  dubious: 'לא מדויק',
  blunder: 'טעות',
};

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
  const quality = explanation?.quality;

  return (
    <div className="node-panel">
      <section className="panel-section move-card">
        <div className="move-head">
          {isRoot ? (
            <span className="san-big">עמדת הפתיחה</span>
          ) : (
            <span className="san-big" dir="ltr">
              {node.moveNumber}
              {node.playedBy === 'w' ? '.' : '…'} {node.san}
            </span>
          )}
          {quality && (
            <span className={`quality-badge quality-${quality}`}>
              {QUALITY_LABEL[quality]}
            </span>
          )}
          <span className="to-move">תור {sideToMove}</span>
        </div>

        {!isRoot && (
          <p className="line-context" dir="ltr">
            {formatLine(line)}
          </p>
        )}

        {explanation ? (
          <p className="rationale">{explanation.rationale}</p>
        ) : (
          <p className="rationale rationale-missing">
            עדיין לא הופק הסבר למהלך זה — בחרו מהלך אחר בעץ.
          </p>
        )}
      </section>

      {node.comment && (
        <section className="panel-section">
          <h2 className="panel-heading">ההערה המקורית שלי</h2>
          <p className="original-annotation">{node.comment}</p>
        </section>
      )}

      <EnginePanel fen={node.fen} />

      <AskBox fen={node.fen} sanPath={line.map((n) => n.san ?? '')} />
    </div>
  );
}
