'use client';

// The conceptual "big picture" for a repertoire: tagline, the archetype shape,
// the handful of ideas, the recurring situations (each with trigger + plan),
// and the key traps. Collapsible — opens at the start, tucks away as you browse.

import { useEffect, useState } from 'react';
import type { Guide } from '@/lib/guide';

export default function BigPicture({ guide, atOpening }: { guide: Guide; atOpening: boolean }) {
  const [open, setOpen] = useState(atOpening);
  useEffect(() => setOpen(atOpening), [atOpening]);

  return (
    <section className="bigpicture">
      <button
        type="button"
        className="bigpicture-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{open ? '▾' : '▸'} התמונה הגדולה — {guide.tagline}</span>
      </button>

      {open && (
        <div className="bigpicture-body">
          <p className="bp-intro">{guide.intro}</p>

          <h3 className="bp-h">המבנה</h3>
          <ul className="bp-list">
            {guide.archetype.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>

          <h3 className="bp-h">הרעיונות</h3>
          <ol className="bp-ideas">
            {guide.ideas.map((idea, i) => (
              <li key={i}>
                <strong>{idea.title}.</strong> {idea.text}
              </li>
            ))}
          </ol>

          <h3 className="bp-h">חמשת המצבים</h3>
          <div className="bp-situations">
            {guide.situations.map((s) => (
              <div key={s.id} className={`bp-sit${s.main ? ' bp-sit-main' : ''}`}>
                <div className="bp-sit-head">
                  <span className="bp-sit-name">{s.name}</span>
                  {s.main && <span className="bp-sit-flag">הליין הראשי שלך</span>}
                </div>
                <div className="bp-sit-trigger">מתי: {s.trigger}</div>
                <div className="bp-sit-plan">{s.plan}</div>
              </div>
            ))}
          </div>

          <h3 className="bp-h">מלכודות לדעת בעל־פה</h3>
          <div className="bp-traps">
            {guide.traps.map((t, i) => (
              <div key={i} className="bp-trap">
                <div className="bp-trap-name">♛ {t.name}</div>
                <div className="bp-trap-text">{t.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
