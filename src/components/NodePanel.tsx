'use client';

// Right-hand panel for the current node: the move, one concise sentence on what
// it's trying to do in the opening, then the optional engine + ask tools.

import type { TreeNode } from '@/lib/tree';
import type { Explanation } from '@/lib/explanations';
import AskBox from './AskBox';
import EnginePanel from './EnginePanel';

interface Props {
  node: TreeNode;
  sanPath: string[];
  explanation: Explanation | null;
}

export default function NodePanel({ node, sanPath, explanation }: Props) {
  const isRoot = node.san === null;

  return (
    <div className="node-panel">
      <section className="panel-section move-card">
        {isRoot ? (
          <p className="san-big">עמדת הפתיחה</p>
        ) : (
          <p className="san-big" dir="ltr">
            {node.moveNumber}
            {node.playedBy === 'w' ? '.' : '…'} {node.san}
          </p>
        )}
        {explanation && explanation.rationale ? (
          <p className="rationale">{explanation.rationale}</p>
        ) : !isRoot ? (
          <p className="rationale rationale-missing">בחרו צעד מהרשימה למעלה.</p>
        ) : (
          <p className="rationale rationale-missing">בחרו צעד כדי לראות מה הוא מנסה לעשות.</p>
        )}
      </section>

      <EnginePanel fen={node.fen} />

      <AskBox fen={node.fen} sanPath={sanPath} />
    </div>
  );
}
