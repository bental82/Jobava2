// Curated knowledge base for the Jobava London repertoire (bilingual: he/en).
//
// Produces a rationale for every node WITHOUT calling an external API, by
// combining (a) the strategic idea of the move in this system with (b) real
// Stockfish grounding (the position's evaluation). This is what
// `npm run build-explanations` writes into data/explanations.json, and what
// `npm run export-pgn` uses to annotate the exported PGN.
//
// We deliberately do NOT state which move the engine "prefers" — only the
// position's evaluation is reported as grounding.

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
export type Lang = 'he' | 'en';

export interface ComposeOptions {
  lang?: Lang; // default 'he'
  includeEval?: boolean; // default true — include the engine-evaluation sentence
}

/**
 * Move quality from the mover's POV — drives the quality badge / tree dots.
 *
 * White moves are repertoire RECOMMENDATIONS: they stay 'good' unless the move
 * is objectively losing. Black moves are judged by how much they worsen Black's
 * position (a large swing = the inaccuracy/blunder the repertoire punishes).
 */
export function computeQuality(n: NodeFacts): Quality {
  if (n.evalHereCp === null) return 'good';
  if (n.playedBy === 'w') {
    if (n.evalHereCp <= -300) return 'blunder';
    if (n.evalHereCp <= -150) return 'dubious';
    return 'good';
  }
  if (n.bestParentCp === null) return 'good';
  const best = -n.bestParentCp;
  const got = -n.evalHereCp;
  const swing = best - got;
  if (swing >= 300) return 'blunder';
  if (swing >= 130) return 'dubious';
  return 'good';
}

// ---- engine-evaluation phrasing -----------------------------------------

function pawns(cp: number, lang: Lang): string {
  if (cp >= 9000) return lang === 'he' ? 'מט' : 'mate';
  if (cp <= -9000) return lang === 'he' ? 'מט נגד הלבן' : 'mate against White';
  const p = cp / 100;
  return (p >= 0 ? '+' : '') + p.toFixed(2);
}

function evalPhrase(cp: number | null, lang: Lang): string {
  if (cp === null) return '';
  if (lang === 'he') {
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
  if (cp >= 9000) return 'White is winning (forced mate)';
  if (cp <= -9000) return 'Black is winning';
  const a = Math.abs(cp);
  const who = cp > 0 ? 'for White' : 'for Black';
  if (a < 30) return 'roughly equal';
  if (a < 90) return `a slight edge ${who}`;
  if (a < 200) return `a clear edge ${who}`;
  if (a < 500) return `a large edge ${who}`;
  return `a decisive edge ${who}`;
}

/** The "Engine evaluation after the move: …" sentence, or null if no eval. */
function evalSentence(n: NodeFacts, lang: Lang): string | null {
  if (n.evalHereCp === null) return null;
  const val = pawns(n.evalHereCp, lang);
  const phrase = evalPhrase(n.evalHereCp, lang);
  return lang === 'he'
    ? `הערכת המנוע לאחר המהלך: ${val} (${phrase}).`
    : `Engine evaluation after the move: ${val} (${phrase}).`;
}

/** A short note for Black inaccuracies/blunders, or null. */
function blackNote(n: NodeFacts, quality: Quality, lang: Lang): string | null {
  if (n.playedBy !== 'b') return null;
  if (quality === 'blunder') {
    return lang === 'he'
      ? 'זהו מהלך שגוי שהלבן מנצל מיד לזכייה בחומר.'
      : 'This is a mistake that White exploits at once to win material.';
  }
  if (quality === 'dubious') {
    return lang === 'he'
      ? 'ניסיון לא מדויק שמשחק לידי הלבן.'
      : "An inaccuracy that plays into White's hands.";
  }
  return null;
}

// ---- strategic idea text (he) -------------------------------------------

const WHITE_IDEA_HE: Record<string, (n: NodeFacts) => string> = {
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

const BLACK_IDEA_HE: Record<string, (n: NodeFacts) => string> = {
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

// ---- strategic idea text (en) -------------------------------------------

const WHITE_IDEA_EN: Record<string, (n: NodeFacts) => string> = {
  d4: () =>
    '1.d4 opens the center and grabs space. It is the foundation of the Jobava London, where White quickly adds Nc3 and Bf4 for natural development and pressure, without heavy theory.',
  Nc3: () =>
    'The signature move of the Jobava London: the knight develops to c3, pressuring d5 and e4 without blocking the c-pawn. This keeps the Nb5 jump and fast pressure available, unlike the classical London with c3.',
  Bf4: () =>
    'The dark-squared bishop comes outside the pawn chain before e3 — the heart of the system. From f4 it pressures c7 and Black\'s kingside and prepares ideas like Nb5.',
  Nb5: () =>
    'The knight jumps to b5, exploiting the weakness of c7. Threats of Nxc7+ (forking king and rook) and an invasion on d6 arise — a practical, aggressive move typical of the Jobava.',
  e3: () =>
    'A foundational move: it opens the f1-bishop, reinforces d4 and completes a solid setup. White now has a sturdy London structure with the bishop already active outside the chain.',
  Nf3: () =>
    'Natural development supporting d4 and e5, preparing short castling and completing White\'s solid setup.',
  Ne2: () =>
    'To e2 rather than f3: this keeps the f-pawn free for a future g4 push, supports the c3-knight, and if Black trades with ...Bxc3 White recaptures with the knight and keeps a good structure. A flexible move typical against ...Bb4.',
  a3: () =>
    'Questions the bishop on b4: if ...Bxc3 White opens a file, improves the structure and keeps the bishop pair; if the bishop retreats White has gained a tempo and space.',
  g4: () =>
    'An aggressive kingside pawn push: it gains space, threatens to trap Black\'s bishop (usually on f5/g6) and opens attacking lines. Typical against ...Bf5 and when Black is slow.',
  f3: () =>
    'Reinforces the center and prepares g4. Against ...Bf5 the idea is g4 and h4 to chase the bishop and grab kingside space.',
  h4: () =>
    'Continues the wing push: it supports g5, widens the attacking chain and sometimes traps Black\'s bishop that retreated to g6.',
  Bd3: () =>
    'Places the bishop on the b1-h7 diagonal, prepares castling, and sometimes trades off Black\'s f5-bishop to control the light squares.',
  dxe5: () =>
    'Opens the center and exploits ...e5. After the exchanges the f4-bishop and b5-knight are very active, and Black often runs into tactical trouble around c7 and d5.',
  Bxe5: (n) =>
    n.evalHereCp !== null && n.evalHereCp >= 300
      ? 'The bishop grabs the knight and wins a whole piece: after ...Nxe5?? Black has no compensation due to the b5-knight and the pressure on c7.'
      : 'The bishop captures in the center and keeps a structural edge with an active pair of pieces.',
  Qxd5: () =>
    'A tactical shot: the queen grabs the d5-pawn with tempo. After the queen trade comes Nxc7+ forking, and White wins material.',
  'Nxc7+': () =>
    'The decisive fork: the knight gives check and grabs the rook on a8 — the culmination of the idea behind Nb5.',
  Bxc7: () =>
    'Grabs the undefended c7-pawn and wins material, exploiting the weakness ...Nc6/...Rb8 left on c7.',
  'Nxd6+': () =>
    'Trades off the d6-bishop — Black\'s good bishop — forcing ...cxd6, which leaves Black with doubled, heavy pawns on the d-file.',
  exd6: () =>
    'The pawn recaptures and keeps the extra material from the gambit, while opening lines that favor White\'s development.',
  e4: () =>
    'Grabs the full center. Against a hypermodern setup (...g6/...d6) White builds a big center and prepares e5 to seize the initiative.',
  e5: () =>
    'Pushes the knight from f6, grabs space and shuts in Black\'s c8-bishop — White gains a spatial initiative.',
  d5: () =>
    'Grabs space and pushes the knight back; against ...c5 White gets a reversed Benoni structure with a tempo and central control.',
  c4: () =>
    'Broadens the center and shifts to a wider structure against Black\'s quiet setups (...c6/...Nc6).',
};

const BLACK_IDEA_EN: Record<string, (n: NodeFacts) => string> = {
  d5: () =>
    'Takes the classical center and establishes a presence on d5/e4. White continues the Jobava plan: Nc3, Bf4 and pressure.',
  Nf6: () =>
    'Develops the knight and controls e4 and d5. White will usually reply Bf4 with calm development.',
  e6: () =>
    'Supports d5 and opens the f8-bishop, but temporarily blocks the c8-bishop (the "bad bishop"). White continues e3 and natural development.',
  Nc6: () =>
    'Active development, but it weakens the defense of c7 and invites Nb5 with threats of Nxc7+ and Nd6 — exactly the structure White welcomes.',
  Ne4: () =>
    'An active central knight that invites trades and tries to ease Black\'s game. White usually responds with a3/f3 or development that exploits the central stability.',
  Bd6: () =>
    'Offers to trade White\'s important f4-bishop. White will consider Bxd6 (giving Black a doubled structure) or retreating to keep the bishop, depending on the position.',
  a6: () =>
    'Pre-empts Nb5 and stakes out a little wing space, but it is a slow move that lets White play g4 or develop calmly with a spatial edge.',
  Bb4: () =>
    'Pins the c3-knight and pressures the center. White answers a3 (to question the bishop) or Ne2 (to support c3 and keep the g4 break flexible).',
  Bf5: () =>
    'Develops the "problem bishop" outside the chain before ...e6. White responds with the f3-g4-h4 plan to chase the bishop and grab space.',
  c6: () =>
    'A solid Slav-like structure supporting d5. White continues e3 and development, with comfortable, easier play.',
  e5: () =>
    'An attempt to break in the center. Usually after dxe5 lines and files open in favor of White\'s developed pieces.',
  d6: () =>
    'A restrained move preparing ...e5 or a hypermodern setup. White grabs the center with e4 and plays on space.',
  Bg6: () =>
    'The bishop retreats after g4. White continues h4-h5 to chase the bishop and open the kingside.',
  Nxe5: () =>
    'Grabs the e5-pawn, but here it is a mistake: Bxe5 wins the knight thanks to the b5-knight and the lack of defense — White wins a piece.',
  Qxd5: () =>
    'Recaptures the pawn, but walks into the Nxc7+ fork; White wins material.',
  Nh5: () =>
    'Attacks the f4-bishop, but the knight is pushed to the rim. White plays e3/Bg5 and keeps an edge.',
  Rb8: () =>
    'Tries to defend c7 indirectly / unpin the rook, but it is too late: White already grabs with Bxc7 or Nxc7+.',
  cxd6: () =>
    'Recaptures on d6, but is left with doubled, heavy pawns on the d-file — exactly the structural edge White was after.',
  c5: () =>
    'Challenges d4 at once. White can play d5 to grab space, or develop while exploiting the lead in development.',
  g6: () =>
    'A King\'s Indian setup: the bishop develops to g7 and pressures the center from afar. White grabs a big center with e4 and prepares e5.',
  Bg7: () =>
    'Completes the fianchetto and pressures the long diagonal. White continues building the center with e4-e5.',
  Qe7: () =>
    'In the 1...e5 line, tries to regain the pawn by pressuring e5. White develops carefully (Nf3, Nc3) and keeps the extra material.',
  Bc5: () =>
    'In the 1...e5 gambit line, develops with tempo against f2. White develops with Nf3 and Nc3 and keeps the extra pawn.',
  Ne7: () =>
    'A knight heading to g6 to pressure e5. White completes development and keeps the material edge.',
  b6: () =>
    'Prepares a fianchetto of the bishop to b7. White grabs the center with e4 and plays on space.',
  f5: () =>
    'An aggressive Dutch-like setup, but it weakens the king. White develops with Nc3 and pressures the weaknesses.',
  Na6: () =>
    'An offbeat development to the rim. White grabs the center (e4) and develops comfortably with an edge.',
};

const FALLBACK = {
  he: {
    w: 'מהלך פיתוח/מבני בתוך תוכנית הז׳ובבה של הלבן: השלמת פיתוח, שמירה על מרכז איתן והכנת לחץ.',
    b: 'מהלך של השחור בתוך הסטאפ שבחר; הלבן ממשיך בתוכנית הטבעית של פיתוח, מרכז ולחץ.',
  },
  en: {
    w: "A developing/structural move within White's Jobava plan: completing development, keeping a solid center and preparing pressure.",
    b: 'A move by Black within the chosen setup; White continues the natural plan of development, center and pressure.',
  },
};

function idea(n: NodeFacts, lang: Lang): string {
  if (n.playedBy === 'w') {
    const table = lang === 'he' ? WHITE_IDEA_HE : WHITE_IDEA_EN;
    return table[n.san]?.(n) ?? FALLBACK[lang].w;
  }
  const table = lang === 'he' ? BLACK_IDEA_HE : BLACK_IDEA_EN;
  return table[n.san]?.(n) ?? FALLBACK[lang].b;
}

/** Compose the full rationale for a node. */
export function composeRationale(n: NodeFacts, opts: ComposeOptions = {}): string {
  const lang = opts.lang ?? 'he';
  const includeEval = opts.includeEval ?? true;
  const quality = computeQuality(n);
  const parts = [
    idea(n, lang),
    includeEval ? evalSentence(n, lang) : null,
    blackNote(n, quality, lang),
  ];
  return parts.filter(Boolean).join(' ').trim();
}
