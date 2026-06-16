// Main page — a Server Component. Loads the PGN + explanation cache from disk,
// builds the tree, and hands them to the interactive client Explorer.

import Explorer from '@/components/Explorer';
import { loadRepertoireTree, loadExplanations } from '@/lib/repertoire';
import { countMoves } from '@/lib/tree';

export default function Page() {
  const { root, tags } = loadRepertoireTree();
  const explanations = loadExplanations();
  const moveCount = countMoves(root);
  const explained = Object.keys(explanations).length;

  return (
    <main className="page">
      <header className="page-header">
        <h1>מדריך הרפרטואר — ז׳ובבה לונדון</h1>
        <p className="subtitle">
          {String(tags.Event ?? 'רפרטואר הלבן')} · {moveCount} מהלכים בעץ ·{' '}
          {explained} הסברים מוכנים
        </p>
      </header>
      <Explorer root={root} explanations={explanations} />
      <footer className="page-footer">
        ההסברים נוצרים מראש (npm run enrich) ונשמרים במטמון. המנוע (Stockfish)
        כבוי כברירת מחדל.
      </footer>
    </main>
  );
}
