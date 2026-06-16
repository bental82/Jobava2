// Curated knowledge base for the Jobava London repertoire.
//
// Produces a Hebrew rationale for every node WITHOUT calling an external API,
// by combining (a) the strategic idea of the move in this system with
// (b) real Stockfish grounding (eval + whether it was the engine's top pick).
// This is what `npm run build-explanations` writes into data/explanations.json.
//
// Design rule: keep strategic statements general enough to stay correct across
// transpositions; lean on the engine fields for anything position-specific.

export interface NodeFacts {
  index: number;
  id: string;
  san: string;
  path: string;
  prevMove: string | null; // opponent's move just before `san`
  playedBy: 'w' | 'b';
  ply: number;
  isLeaf: boolean;
  evalHereCp: number | null; // White POV, after `san`
  rankAtParent: number | null; // 1 = engine's top, -1 = outside top 3
  bestParentMove: string | null;
  bestParentCp: number | null; // White POV
}

export type Quality = 'good' | 'dubious' | 'blunder';

/**
 * Move quality from the mover's POV — drives the board arrow color.
 *
 * White moves are repertoire RECOMMENDATIONS: they stay green unless the move
 * is objectively losing. The "engine prefers X" nuance lives in the text, not
 * the arrow. Black moves are judged by how much they worsen Black's position
 * (a large swing = the inaccuracy/blunder the repertoire is set up to punish).
 */
export function computeQuality(n: NodeFacts): Quality {
  if (n.evalHereCp === null) return 'good';
  if (n.playedBy === 'w') {
    // From White's POV: only flag if White's own move lands in a bad eval.
    if (n.evalHereCp <= -300) return 'blunder';
    if (n.evalHereCp <= -150) return 'dubious';
    return 'good';
  }
  if (n.bestParentCp === null) return 'good';
  // Black: swing between best Black could get and what this move yields.
  const best = -n.bestParentCp;
  const got = -n.evalHereCp;
  const swing = best - got;
  if (swing >= 300) return 'blunder';
  if (swing >= 130) return 'dubious';
  return 'good';
}

const W = '‏'; // RLM helper for mixed text (kept minimal)

function pawns(cp: number): string {
  if (cp >= 9000) return 'מט';
  if (cp <= -9000) return 'מט נגד הלבן';
  const p = cp / 100;
  return (p >= 0 ? '+' : '') + p.toFixed(2);
}

/** Short engine evaluation phrase from White's POV. */
function evalPhrase(cp: number | null): string {
  if (cp === null) return '';
  if (cp >= 9000) return 'הלבן מנצח (מט בכפייה)';
  if (cp <= -9000) return 'השחור מנצח';
  const a = Math.abs(cp);
  const who = cp > 0 ? 'ללבן' : 'לשחור';
  if (a < 30) return 'העמדה שקולה בקירוב';
  if (a < 90) return `יתרון קל ${who}`;
  if (a < 200) return `יתרון ברור ${who}`;
  if (a < 500) return `יתרון גדול ${who}`;
  return `יתרון מכריע ${who}`;
}

/** The engine grounding clause appended to most explanations. */
function grounding(n: NodeFacts, quality: Quality): string {
  const parts: string[] = [];
  const ev = evalPhrase(n.evalHereCp);
  if (n.evalHereCp !== null) {
    parts.push(`הערכת המנוע לאחר המהלך: ${pawns(n.evalHereCp)} (${ev}).`);
  }
  // NOTE: we deliberately do NOT state which move the engine "prefers" — the
  // point of a repertoire is the chosen move and its plan, not the engine's
  // top pick. Only the position's evaluation is reported as grounding.
  if (n.playedBy === 'b') {
    if (quality === 'blunder') parts.push('זהו מהלך שגוי שהלבן מנצל מיד לזכייה בחומר.');
    else if (quality === 'dubious') parts.push('ניסיון לא מדויק שמשחק לידי הלבן.');
  }
  return parts.join(' ');
}

// ---- strategic idea text -------------------------------------------------

const WHITE_IDEA: Record<string, (n: NodeFacts) => string> = {
  d4: () =>
    '1.d4 פותח את המרכז ותופס שטח. זהו הבסיס לשיטת ז׳ובבה־לונדון, שבה הלבן ישלב במהירות Nc3 ו-Bf4 לפיתוח טבעי וללחץ, בלי להיכנס לתיאוריה כבדה.',
  Nc3: () =>
    'מהלך הזיהוי של ז׳ובבה־לונדון: הפרש מתפתח ל-c3 ולוחץ על המשבצות d5 ו-e4 מבלי לחסום את רגל ה-c. כך נשמרת האופציה של Nb5 ושל לחץ מהיר, בשונה מהלונדון הקלאסי עם c3.',
  Bf4: () =>
    'הרץ השחור־משבצות יוצא אל מחוץ לשרשרת הרגלים עוד לפני e3 — לב השיטה. מ-f4 הוא לוחץ על c7 ועל הכנף המלכותית של השחור ומכין רעיונות כמו Nb5.',
  Nb5: () =>
    'הפרש קופץ ל-b5 ומנצל את חולשת המשבצת c7. נוצרים איומים של Nxc7+ (מזלג על המלך והצריח) ושל פלישה ל-d6 — מהלך מעשי ואגרסיבי האופייני לז׳ובבה.',
  e3: () =>
    'מהלך־יסוד: פותח את רץ f1, מבצר את הרגל d4 ומשלים פיתוח איתן. כעת ללבן מבנה לונדון מוצק עם הרץ כבר פעיל מחוץ לשרשרת הרגלים.',
  Nf3: () =>
    'פיתוח טבעי שתומך ב-d4 וב-e5, מכין הצרחה קצרה ומשלים את הסטאפ המוצק של הלבן.',
  Ne2: () =>
    'דווקא ל-e2 ולא ל-f3: כך נשמר רגל ה-f לדחיפת g4 בעתיד, הפרש תומך ב-Nc3, ואם השחור יחליף ב-...Bxc3 הלבן יחזיר בפרש וישמור על מבנה טוב. מהלך גמיש האופייני נגד ...Bb4.',
  a3: () =>
    'שואל את הרץ ב-b4: אם ...Bxc3 הלבן פותח קו, משפר מבנה ושומר על זוג הרצים, ואם הרץ נסוג הלבן הרוויח טמפו ומרחב.',
  g4: () =>
    'דחיפת רגל תוקפנית בכנף המלכותית: מרחיבה שטח, מאיימת לתפוס את רץ השחור (בדרך כלל ב-f5/g6) ופותחת קווי התקפה. אופייני נגד ...Bf5 ובעמדות בהן השחור איטי.',
  f3: () =>
    'מבצר את המרכז ומכין g4. נגד ...Bf5 הרעיון הוא g4 ו-h4 כדי לרדוף אחרי הרץ ולתפוס שטח רב בכנף.',
  h4: () =>
    'ממשיך את דחיפת הכנף: תומך ב-g5, מרחיב את שרשרת ההתקפה ולעיתים לוכד את רץ השחור שנסוג ל-g6.',
  Bd3: () =>
    'ממקם את הרץ על האלכסון b1-h7, מכין הצרחה, ולעיתים החלפה של רץ ה-f5 של השחור כדי לשלוט במשבצות הלבנות.',
  dxe5: () =>
    'פותח את המרכז ומנצל את ...e5. אחרי ההחלפות הרץ ב-f4 והפרש ב-b5 פעילים מאוד, והשחור נתקל לעיתים בקשיים טקטיים סביב c7 ו-d5.',
  Bxe5: (n) =>
    n.evalHereCp !== null && n.evalHereCp >= 300
      ? 'הרץ חוטף את הפרש וזוכה בכלי שלם: אחרי ...Nxe5?? אין לשחור פיצוי בשל הפרש ב-b5 והלחץ על c7.'
      : 'הרץ חוטף במרכז ושומר על יתרון מבני ועל זוג כלים פעיל.',
  Qxd5: () =>
    'ניצול טקטי: המלכה חוטפת את הרגל d5 בתקיפה. לאחר חילופי מלכות יבוא Nxc7+ במזלג, והלבן זוכה בחומר.',
  'Nxc7+': () =>
    'המזלג המכריע: הפרש נותן שח וחוטף את הצריח ב-a8 — שיא הרעיון שמאחורי Nb5.',
  Bxc7: () =>
    'חוטף את הרגל c7 הבלתי מוגן ומרוויח חומר, בניצול החולשה ש-...Nc6/...Rb8 הותירו על c7.',
  'Nxd6+': () =>
    'מחליף את רץ d6 — הרץ הטוב של השחור — ומכריח ...cxd6, שמותיר לשחור מבנה רגלים כפול וכבד על קו ה-d.',
  exd6: () =>
    'הרגל חוטף בחזרה ושומר על החומר העודף מהגמביט, תוך פתיחת קווים לטובת הפיתוח של הלבן.',
  e4: () =>
    'תופס מרכז מלא. נגד סטאפ היפר־מודרני (...g6/...d6) הלבן בונה מרכז גדול ומכין e5 לדחיקת הפרש ולפתיחת יוזמה.',
  e5: () =>
    'דוחף את הפרש מ-f6, תופס שטח וסוגר את רץ c8 של השחור — הלבן זוכה ביוזמה מרחבית.',
  d5: () =>
    'תופס שטח ודוחה את הפרש; נגד ...c5 הלבן מקבל מבנה בנוני־הודי הפוך עם טמפו ושליטה מרכזית.',
  c4: () =>
    'מרחיב את המרכז ועובר למבנה רחב יותר נגד סטאפים שקטים של השחור (...c6/...Nc6).',
};

const BLACK_IDEA: Record<string, (n: NodeFacts) => string> = {
  d5: () =>
    'תופס מרכז קלאסי ומבסס נוכחות ב-d5/e4. הלבן ימשיך בתוכנית הז׳ובבה: Nc3, Bf4 ולחץ.',
  Nf6: () =>
    'מפתח את הפרש ושולט ב-e4 וב-d5. הלבן יענה לרוב ב-Bf4 ובפיתוח רגוע.',
  e6: () =>
    'תומך ב-d5 ופותח את רץ f8, אך חוסם זמנית את רץ c8 (״הרץ הרע״). הלבן ימשיך e3 ופיתוח טבעי.',
  Nc6: () =>
    'פיתוח פעיל, אך הוא מחליש את ההגנה על c7 ומזמין את Nb5 עם איומי Nxc7+ ו-Nd6 — בדיוק המבנה שהלבן מקדם בברכה.',
  Ne4: () =>
    'פרש פעיל במרכז שמזמין החלפות ומנסה להקל על השחור. הלבן יגיב בדרך כלל ב-a3/f3 או בפיתוח שמנצל את היציבות במרכז.',
  Bd6: () =>
    'מציע להחליף את רץ f4 החשוב של הלבן. הלבן ישקול Bxd6 (שמעניק לשחור מבנה כפול) או נסיגה כדי לשמור על הרץ, לפי העמדה.',
  a6: () =>
    'מונע מראש את Nb5 וקובע מעט שטח בכנף, אך זהו מהלך איטי שמאפשר ללבן g4 או פיתוח רגוע עם יתרון מרחבי.',
  Bb4: () =>
    'סיכה על הפרש c3 ולחץ על המרכז. הלבן יענה a3 (לשאול את הרץ) או Ne2 (לתמוך ב-c3 ולשמור על גמישות g4).',
  Bf5: () =>
    'מפתח את ״הרץ הבעייתי״ אל מחוץ לשרשרת לפני ...e6. הלבן מגיב בתוכנית f3-g4-h4 כדי לרדוף אחרי הרץ ולתפוס שטח.',
  c6: () =>
    'מבנה סלאבי מוצק שתומך ב-d5. הלבן ממשיך e3 ופיתוח, עם משחק נוח וקל יותר.',
  e5: () =>
    'ניסיון לשבור במרכז. לרוב לאחר dxe5 נפתחים קווים וטורים לטובת הכלים המפותחים של הלבן.',
  d6: () =>
    'מהלך מאופק שמכין ...e5 או סטאפ היפר־מודרני. הלבן תופס מרכז ב-e4 ומשחק על המרחב.',
  Bg6: () =>
    'נסיגת הרץ אחרי g4. הלבן ממשיך h4-h5 כדי לרדוף אחרי הרץ ולפתוח את הכנף המלכותית.',
  Nxe5: () =>
    'חוטף את הרגל ב-e5, אך כאן זו טעות: Bxe5 חוטף את הפרש בזכות הפרש ב-b5 וחוסר ההגנה — הלבן זוכה בכלי.',
  Qxd5: () =>
    'חוטף בחזרה את הרגל, אך נכנס ל-Nxc7+ המזלג; הלבן זוכה בחומר.',
  Nh5: () =>
    'תוקף את רץ f4, אך הפרש נדחק לשוליים. הלבן משחק e3/Bg5 ושומר על יתרון.',
  Rb8: () =>
    'מנסה להגן בעקיפין על c7 / לפנות את הצריח, אך מאוחר מדי: הלבן כבר חוטף עם Bxc7 או Nxc7+.',
  cxd6: () =>
    'מחזיר על d6, אך נשאר עם רגליים כפולות וכבדות על קו ה-d — בדיוק היתרון המבני שהלבן חיפש.',
  c5: () =>
    'מאתגר מיד את d4. הלבן יכול d5 לתפוס שטח, או לפתח תוך ניצול היתרון בפיתוח.',
  g6: () =>
    'מבנה קינג׳ס־אינדיאני: הרץ יפותח ל-g7 וילחץ על המרכז מרחוק. הלבן תופס מרכז גדול ב-e4 ומכין e5.',
  Bg7: () =>
    'משלים את הפיאנקטו ולוחץ על האלכסון הארוך. הלבן ממשיך בבניית מרכז עם e4-e5.',
  Qe7: () =>
    'בקו ה-1...e5, מנסה להחזיר את הרגל בלחץ על e5. הלבן מפתח בזהירות (Nf3, Nc3) ושומר על החומר העודף.',
  Bc5: () =>
    'בקו הגמביט 1...e5, מפתח בלחץ ומכוון נגד f2. הלבן מפתח עם Nf3 ו-Nc3 ושומר על הרגל העודף.',
  Ne7: () =>
    'פרש שמכוון ל-g6 כדי ללחוץ על e5. הלבן משלים פיתוח ושומר על היתרון החומרי.',
  b6: () =>
    'מכין פיאנקטו של הרץ ל-b7. הלבן תופס מרכז ב-e4 ומשחק על השטח.',
  f5: () =>
    'מבנה הולנדי תוקפני, אך מחליש את עמדת המלך. הלבן מפתח עם Nc3 ולוחץ על החולשות.',
  Na6: () =>
    'פיתוח לא שגרתי לשוליים. הלבן תופס מרכז (e4) ומפתח בנוחות עם יתרון.',
};

const FALLBACK_W = 'מהלך פיתוח/מבני בתוך תוכנית הז׳ובבה של הלבן: השלמת פיתוח, שמירה על מרכז איתן והכנת לחץ.';
const FALLBACK_B = 'מהלך של השחור בתוך הסטאפ שבחר; הלבן ממשיך בתוכנית הטבעית של פיתוח, מרכז ולחץ.';

/** Compose the full Hebrew rationale for a node. */
export function composeRationale(n: NodeFacts): string {
  const idea =
    n.playedBy === 'w'
      ? (WHITE_IDEA[n.san]?.(n) ?? FALLBACK_W)
      : (BLACK_IDEA[n.san]?.(n) ?? FALLBACK_B);
  const quality = computeQuality(n);
  const ground = grounding(n, quality);
  return [idea, ground].filter(Boolean).join(' ').trim();
}
