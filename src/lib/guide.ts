// Conceptual "big picture" guide per repertoire: the archetype, the handful of
// ideas, the recurring SITUATIONS (each with a trigger + a plan), and the key
// traps. The point is to learn the shape and the triggers, then reconstruct the
// moves from logic instead of memorising a list.
//
// Every position is classified into one situation (by scanning the moves
// played), so the node panel can show "you are in situation X — here is its
// plan", which is the whole learning idea.

import type { RepId } from './repMeta';

export interface Idea {
  title: string;
  text: string;
}
export interface Situation {
  id: string;
  name: string;
  trigger: string;
  plan: string;
  main?: boolean;
}
export interface Trap {
  name: string;
  text: string;
}
export interface Guide {
  tagline: string;
  intro: string;
  archetype: string[];
  ideas: Idea[];
  situations: Situation[];
  traps: Trap[];
}

// ---------------------------------------------------------------- BLACK ----
const BLACK_GUIDE: Guide = {
  tagline: 'מבנה אחד, כל משחק.',
  intro:
    'כל הרפרטואר מצטמצם למבנה אחד ולחמש תוכניות. תלמד את המבנה — והמהלכים מפסיקים להיות רשימה לשינון והופכים למובנים מאליהם. כשעמדה מרגישה לא מוכרת, אל תנסה להיזכר — שאל: איזה מבין חמשת המצבים זה? התוכנית נובעת מהתשובה.',
  archetype: [
    '…c6 ו-…d5 — תופסים את המרכז בצמד רגלים בלי חורים.',
    '…Bf5 / …Bg4 — הרץ יוצא לפני שמשהו יכול ללכוד אותו. זו כל המהות של הקארו.',
    '…e6 — רק עכשיו סוגרים את המשולש. הרץ כבר חופשי.',
    '…Nf6 — טבעי, מכוון ל-e4 ו-d5.',
    '…Nbd7 — גמיש; תומך בשבירות …c5 / …e5.',
  ],
  ideas: [
    {
      title: 'צמד מוצק',
      text: 'הרגלים c6–d5 נותנים מרכז חסין. קודם מוצק, אחר כך פעיל — שום דבר לא יכול להיחפז נגדך.',
    },
    {
      title: 'רץ לפני רגל',
      text: '…Bf5 / …Bg4 חייבים לצאת לפני …e6. הכלל היחיד הזה הוא הסיבה שאתה משחק קארו ולא צרפתית — הרץ הקל שלך לעולם לא נקבר מאחורי הרגלים שלו.',
    },
    {
      title: 'לפרשים יש תפקיד',
      text: '…Nf6 תמיד. הפרש השני: …Nbd7 כשרגל ה-c נשארת, …Nc6 כשטור ה-c נפתח (וריאציית ההחלפה).',
    },
    {
      title: 'להחליף כדי לנשום',
      text: 'החלפת הרץ הקל (…Bxd3 / …Bxf3) משחררת את הכלי הלחוץ היחיד שלך, ולרוב משאירה ללבן ויתור מבני קטן.',
    },
    {
      title: 'להעניש פזיזות',
      text: 'שתי מתנות חוזרות: …Qxd4 כש-Bd3 חוסם ללבן את המלכה שלו, ו-…Qxd1+ לתוך סיום נוח מול מבני d3 איטיים.',
    },
  ],
  situations: [
    {
      id: 'advance',
      name: 'הקידום — מרכז נעול',
      trigger: 'הלבן משחק e5',
      plan: 'רץ קודם (…Bf5), אז …e6, …Nd7, להחליף רצים קלים, ולשבור מאוחר עם …c5 או …f6. אם פרש הלבן כבר על f3 — סכל אותו עם …Bg4 במקום.',
    },
    {
      id: 'exchange',
      name: 'ההחלפה — סימטריה',
      trigger: 'הלבן משחק exd5',
      plan: 'קח …cxd5, ואז פשוט פתח טבעי: …Nc6, …Bg4 (או …Bf5), …Nf6, …e6. עמדה כמעט סימטרית — תהיה נוח, לא חכם.',
      main: true,
    },
    {
      id: 'twoknights',
      name: 'מרכז גדול / שני פרשים',
      trigger: 'הלבן בונה מרכז (d4 + Nc3)',
      plan: 'קח אותו — …dxe4 — אז רץ החוצה …Bf5 וסיים פיתוח. שים לב למתנה: אם הלבן עונה Bd3, חטוף את הרגל עם …Qxd4.',
    },
    {
      id: 'quiet',
      name: 'מבנים שקטים ו-d3',
      trigger: 'הלבן משחק שקט (d3 או יציאת מלכה מוקדמת)',
      plan: 'פשוט שחק …d5 ופתח. מול d3, סיום …dxe4 / …Qxd1+ שווה לחלוטין וקל. מול יציאות מלכה מוקדמות — פתח עם טמפו והתעלם מהבלוף.',
    },
    {
      id: 'slav',
      name: 'צד הסלאב (1.d4 / לונדון)',
      trigger: 'הלבן פותח 1.d4',
      plan: '…d5, …Nf6, ואז הכה במרכז עם …c5 ופתח …Nc6; שחק …Bf5 כשמותר. מול לונדון Bf4 — …Bd6 מאתגר אותו. מול c4 אמיתי — לך לסלאב עם …c6.',
    },
  ],
  traps: [
    {
      name: 'הרגל החופשי — …Qxd4',
      text: 'שיחקת …dxe4, הלבן החזיר, ואז הציב רץ ל-d3. ה-Bd3 עומד עכשיו בין המלכה של הלבן לרגל d4 — אז d4 לא מוגן. קח: 5.Bd3 Qxd4 זוכה ברגל נקי. אם 6.Nf3 תוקף את המלכה — סגת, ומשאב …Qe4+ מציל את הרץ; אתה פשוט נשאר רגל מעלה.',
    },
    {
      name: 'הסיום הקל — …Qxd1+',
      text: 'מול מבני d3, אחרי …dxe4 dxe4 שחק …Qxd1+. הלבן חייב לחטוף במלך ומאבד הצרחה; אתה ממשיך …Nf6 שתוקף את e4, ומגיע לסיום לפחות שווה עם עמדה פשוטה יותר לשחק.',
    },
  ],
};

// ---------------------------------------------------------------- WHITE ----
const WHITE_GUIDE: Guide = {
  tagline: 'רץ אחד, כמה תוכניות.',
  intro:
    'כל הרפרטואר בנוי סביב מבנה אחד: Bf4 מחוץ לשרשרת, Nc3 גמיש, ולחץ מעשי. זהה איזו תוכנית מתאימה לסטאפ של השחור, והמהלכים מתבקשים מעצמם.',
  archetype: [
    'd4 + Nc3 + Bf4 — פיתוח מהיר עם לחץ, בלי תיאוריה כבדה.',
    'Bf4 יוצא לפני e3 — הרץ פעיל מחוץ לשרשרת הרגלים.',
    'הפרש ל-c3 (לא רגל) — שומר את הקפיצה Nb5 ואת רגל ה-c גמישה.',
    'e3 מבצר את d4 ופותח את רץ f1.',
  ],
  ideas: [
    { title: 'הרץ יוצא מוקדם', text: 'Bf4 לפני e3 — לב השיטה; הרץ לוחץ על c7 ועל הכנף.' },
    { title: 'פרש ל-c3', text: 'מפתח ולוחץ על d5/e4 בלי לחסום את רגל ה-c — שומר על Nb5.' },
    { title: 'Nb5 על c7', text: 'מנצל את חולשת c7, במיוחד אחרי …Nc6, עם איומי Nxc7+ ו-Nd6.' },
    { title: 'דחיפת כנף g4/h4', text: 'מול …Bf5 — f3, g4, h4 רודפים את הרץ ותופסים שטח.' },
    { title: 'מול היפר־מודרני', text: 'מול …g6/…d6 — בנה מרכז עם e4 ואז e5 ליוזמה.' },
  ],
  situations: [
    {
      id: 'classic',
      name: '…d5 קלאסי',
      trigger: 'השחור משחק …d5',
      plan: 'e3, פיתוח טבעי (Nf3/Ne2, Bd3) ולחץ מבני שקט. מבנה לונדון מוצק עם הרץ כבר פעיל.',
      main: true,
    },
    {
      id: 'c7',
      name: 'לחץ על c7 — Nb5',
      trigger: 'השחור משחק …Nc6',
      plan: 'Nb5 מיד! מנצל את חולשת c7 עם איומי Nxc7+ ו-Nd6. אם …e5 — dxe5 ולחץ טקטי.',
    },
    {
      id: 'wing',
      name: 'רדיפת הרץ — g4/h4',
      trigger: 'השחור משחק …Bf5',
      plan: 'f3, g4, h4 — רודפים את הרץ ל-g6 ולוכדים/דוחקים אותו, תוך תפיסת שטח בכנף.',
    },
    {
      id: 'hypermodern',
      name: 'מול היפר־מודרני — e4/e5',
      trigger: 'השחור משחק …g6 / …d6',
      plan: 'בנה מרכז גדול עם e4, ואז e5 לדחיקת הפרש ולפתיחת יוזמה מרחבית.',
    },
    {
      id: 'gambit',
      name: 'גמביט …e5',
      trigger: 'השחור משחק 1…e5',
      plan: 'dxe5 וקח את הרגל; פתח בזהירות (Nf3, Nc3) ושמור על החומר העודף.',
    },
  ],
  traps: [
    {
      name: 'המזלג — Nxc7+',
      text: 'אחרי …Nc6 ו-Nb5, אם השחור מתעלם: e5 dxe5 Nxe5?? Bxe5 או הקו …Ne4 Qxd5 Qxd5 Nxc7+ — מזלג על המלך והצריח שזוכה בחומר.',
    },
    {
      name: 'חטיפת c7 — Bxc7',
      text: 'אם השחור משחק …Rb8 כדי להגן בעקיפין על c7, זה מאוחר מדי: Bxc7 פשוט חוטף רגל חופשי.',
    },
  ],
};

export const GUIDES: Record<RepId, Guide> = { white: WHITE_GUIDE, black: BLACK_GUIDE };

/**
 * Classify the current line into one situation by scanning the moves played
 * (with their side). Returns null when it's too early / undetermined.
 */
export function classifySituation(
  repId: RepId,
  line: { san: string | null; playedBy: 'w' | 'b' | null }[],
): Situation | null {
  const guide = GUIDES[repId];
  const byId = (id: string) => guide.situations.find((s) => s.id === id) ?? null;
  const whiteHas = (s: string) => line.some((n) => n.playedBy === 'w' && n.san === s);
  const blackHas = (s: string) => line.some((n) => n.playedBy === 'b' && n.san === s);
  const first = line[0];

  if (repId === 'black') {
    if (first && (first.san === 'd4' || first.san === 'c4')) return byId('slav');
    if (whiteHas('exd5') || blackHas('cxd5')) return byId('exchange');
    if (whiteHas('e5')) return byId('advance');
    // d3 / early-queen lines also feature ...dxe4, so check them BEFORE
    // the big-centre (d4) Two Knights signature.
    if (whiteHas('d3') || whiteHas('Qh5') || whiteHas('Qf3')) return byId('quiet');
    if (blackHas('dxe4')) return byId('twoknights');
    return null;
  }

  // white (Jobava)
  if (whiteHas('Nb5')) return byId('c7');
  if (blackHas('Bf5')) return byId('wing');
  if (blackHas('g6')) return byId('hypermodern');
  if (blackHas('e5')) return byId('gambit');
  if (blackHas('d5')) return byId('classic');
  return null;
}
