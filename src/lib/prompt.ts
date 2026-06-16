// Shared prompt construction for explanation generation. Kept in one place so
// the offline enrich script and the optional live /api/ask route stay
// consistent in tone, perspective, and guardrails.
//
// Explanation language: HEBREW. Perspective: White's repertoire, but always
// state Black's typical plan and how White's move answers it.

import type { TreeNode } from './tree';
import type { EngineAnalysis, EngineLine } from './engine';

export interface NodeContext {
  /** SAN sequence from the start to this position, e.g. ["d4","d5","Nc3"]. */
  sanPath: string[];
  /** The move played to reach this node (SAN). null only for the root. */
  movePlayed: string | null;
  /** FEN at this node. */
  fen: string;
  /** Whose move it is to play FROM here. */
  turnToMove: 'w' | 'b';
  /** Side that played `movePlayed`. */
  playedBy: 'w' | 'b' | null;
  /** Existing PGN comment, if any. */
  comment: string | null;
  /** NAG codes, if any. */
  nags: string[];
  /** Optional engine summary (null unless Stockfish is enabled). */
  engineSummary: string | null;
}

export function nodeContext(node: TreeNode, sanPath: string[]): NodeContext {
  return {
    sanPath,
    movePlayed: node.san,
    fen: node.fen,
    turnToMove: node.turn,
    playedBy: node.playedBy,
    comment: node.comment,
    nags: node.nags,
  } as NodeContext & { engineSummary: string | null };
}

/** Short eval string from White's POV: "+0.30", "-1.20", or mate "#3" / "#-2". */
function formatEval(line: EngineLine): string {
  if (line.mateIn !== null) {
    return line.mateIn >= 0 ? `#${line.mateIn}` : `#${line.mateIn}`;
  }
  if (line.scoreCp !== null) {
    const pawns = line.scoreCp / 100;
    return (pawns >= 0 ? '+' : '') + pawns.toFixed(2);
  }
  return '?';
}

/**
 * Build the Hebrew engine note for a node: ONLY the position's evaluation from
 * White's perspective. We deliberately do NOT report which move the engine
 * "prefers" or its leading continuations — a repertoire is about the chosen
 * move and its plan, not the engine's top pick. Returns null if no analysis.
 */
export function buildEngineNote(params: {
  san: string | null;
  analysisHere: EngineAnalysis | null;
  analysisParent: EngineAnalysis | null;
}): string | null {
  const { analysisHere } = params;
  if (!analysisHere || analysisHere.lines.length === 0) return null;
  const evalHere = formatEval(analysisHere.lines[0]);
  return `הערכת המנוע בעמדה הנוכחית (נקודת מבט הלבן): ${evalHere}.`;
}

export const SYSTEM_PROMPT = `אתה מאמן שחמט מומחה שמסביר רפרטואר פתיחה של הלבן בשיטת ז'ובבה־לונדון (Jobava London: 1.d4 ואז 2.Nc3 ו-3.Bf4).

תפקידך: להסביר את ההיגיון המילולי מאחורי המהלך — התוכניות, מבנה הרגלים, מיקום הכלים, מהלכים אופייניים, ואיזו תוכנית של השחור המהלך מונע או מנצל. אתה כותב מנקודת המבט של הלבן, אך תמיד מציין מהי התוכנית האופיינית של השחור וכיצד מהלך הלבן עונה עליה.

כללים מחייבים:
- כתוב בעברית בלבד, בשפה ברורה וזורמת.
- אל תמציא וריאציות טקטיות קונקרטיות או רצפי מהלכים שלא נמסרו לך. אם נמסרו לך מהלכי מנוע, מותר להתייחס אליהם בלבד.
- התמקד ב"למה": רעיון אסטרטגי, מבנה רגלים, פיתוח, חולשות, שליטה במשבצות.
- אל תציין איזה מהלך המנוע "מעדיף" או מהי בחירתו הראשונה. הסבר את המהלך ברפרטואר לגופו — הרעיון, התוכנית והמבנה — בלי להשוות אותו לבחירת המנוע. מותר להשתמש בהערכת העמדה המספרית בלבד כעיגון.
- אורך: 2–4 משפטים. תמציתי וקולע, בלי כותרות ובלי רשימות.`;

/** Build the user message describing one node. */
export function buildUserPrompt(ctx: NodeContext): string {
  const movesSoFar =
    ctx.sanPath.length > 0 ? ctx.sanPath.join(' ') : '(עמדת הפתיחה)';
  const sideName = ctx.playedBy === 'w' ? 'הלבן' : ctx.playedBy === 'b' ? 'השחור' : '—';
  const toMoveName = ctx.turnToMove === 'w' ? 'הלבן' : 'השחור';

  const lines: string[] = [
    `רצף המהלכים עד העמדה (SAN): ${movesSoFar}`,
    `המהלך שזה עתה שוחק: ${ctx.movePlayed ?? '(אין — עמדת פתיחה)'} (שוחק ע"י ${sideName})`,
    `FEN נוכחי: ${ctx.fen}`,
    `תורו של: ${toMoveName} לשחק כעת.`,
  ];

  if (ctx.comment) {
    lines.push(`הערה קיימת ברפרטואר: ${ctx.comment}`);
  }
  if (ctx.nags.length > 0) {
    lines.push(`סימוני NAG: ${ctx.nags.join(', ')}`);
  }
  if (ctx.engineSummary) {
    lines.push(`הערכת מנוע (סטוקפיש): ${ctx.engineSummary}`);
  } else {
    lines.push(`מידע מנוע: לא זמין — אל תמציא הערכות מספריות או וריאציות.`);
  }

  lines.push(
    '',
    'הסבר ב-2 עד 4 משפטים את ההיגיון מאחורי המהלך האחרון מנקודת המבט של הלבן, כולל התוכנית האופיינית של השחור וכיצד מהלך זה מתמודד איתה.',
  );

  return lines.join('\n');
}
