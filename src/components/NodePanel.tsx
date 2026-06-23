'use client';

// Right-hand panel for the current node: the move, WHICH big-picture situation
// this position belongs to and that situation's plan (the main takeaway), then
// a short note on the specific move, then the optional engine + ask tools.

import type { TreeNode } from '@/lib/tree';
import type { Explanation } from '@/lib/explanations';
import type { Situation } from '@/lib/guide';
import AskBox from './AskBox';
import EnginePanel from './EnginePanel';

interface Props {
  node: TreeNode;
  sanPath: string[];
  explanation: Explanation | null;
  situation: Situation | null;
}

export default function NodePanel({ node, sanPath, explanation, situation }: Props) {
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

        {situation ? (
          <div className="situation">
            <span className="situation-badge">{situation.name}</span>
            <p className="situation-plan">{situation.plan}</p>
          </div>
        ) : (
          !isRoot && (
            <p className="situation-hint">המשיכו עד שמבנה הלבן מתברר — אז יופיע המצב והתוכנית.</p>
          )
        )}

        {explanation && explanation.rationale && !isRoot && (
          <p className="rationale">
            <span className="rationale-label">הצעד הזה: </span>
            {explanation.rationale}
          </p>
        )}
      </section>

      <EnginePanel fen={node.fen} />

      <AskBox fen={node.fen} sanPath={sanPath} />
    </div>
  );
}
