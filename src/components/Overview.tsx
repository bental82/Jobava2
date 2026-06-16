'use client';

// Opening-level "meta": a concise overview of the Jobava London — the ideas,
// pawn structures and typical plans that the per-move explanations build on.
// Collapsible so it stays out of the way once read.

import { useState } from 'react';

export default function Overview() {
  const [open, setOpen] = useState(true);
  return (
    <section className="overview">
      <button
        type="button"
        className="overview-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? '▾' : '▸'} על השיטה — ז׳ובבה לונדון
      </button>
      {open && (
        <div className="overview-body">
          <p>
            <strong>הרעיון המרכזי:</strong> 1.d4, 2.Nc3 ו-3.Bf4 — הלבן מוציא את
            הרץ השחור־משבצות אל מחוץ לשרשרת הרגלים עוד <em>לפני</em> e3, ומפתח
            במהירות עם לחץ. בשונה מהלונדון הקלאסי, רגל ה-c נשארת גמישה והפרש ב-c3
            מאפשר את הקפיצה האגרסיבית Nb5.
          </p>
          <p>
            <strong>תוכניות אופייניות:</strong> (1) Nb5 המנצל את חולשת c7 (במיוחד
            אחרי ...Nc6), עם איומי Nxc7+ ופלישה ל-d6; (2) דחיפת רגלים בכנף
            המלכותית — f3, g4 ו-h4 — כדי לרדוף אחרי רץ c8 של השחור (לרוב ב-...Bf5)
            ולתפוס שטח; (3) נגד מבנים היפר־מודרניים (...g6/...d6) — בניית מרכז עם
            e4 ואז e5.
          </p>
          <p>
            <strong>מבנה ופיתוח:</strong> e3 מבצר את d4 ופותח את רץ f1; לעיתים
            Ne2 (ולא Nf3) כדי לשמור על רגל ה-f לדחיפת g4 ולתמוך ב-c3. נגד ...Bb4
            הלבן משחק a3 או Ne2. המטרה: עמדה איתנה, קלה לשחק, עם יוזמה מעשית ובלי
            תיאוריה כבדה.
          </p>
          <p className="overview-note">
            לכל מהלך בעץ יש הסבר נפרד מימין, מעוגן בניתוח מנוע (Stockfish): הערכה,
            והאם המהלך הוא בחירת המנוע או בחירת רפרטואר מעשית. החצים על הלוח
            מציינים את המהלך (ירוק=תקין, כתום=לא מדויק, אדום=טעות).
          </p>
        </div>
      )}
    </section>
  );
}
