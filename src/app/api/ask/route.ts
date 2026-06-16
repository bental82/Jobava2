// Optional "Ask about this position" endpoint. Server-side ONLY — the API key
// never reaches the client. Degrades gracefully when ANTHROPIC_API_KEY is unset.

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/lib/prompt';

export const runtime = 'nodejs';

const ASK_MODEL = process.env.ASK_MODEL ?? 'claude-sonnet-4-6';

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'מפתח ה-API אינו מוגדר בשרת (ANTHROPIC_API_KEY).' },
      { status: 503 },
    );
  }

  let body: { fen?: string; sanPath?: string[]; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 400 });
  }

  const { fen, sanPath = [], question } = body;
  if (!fen || !question || question.trim().length === 0) {
    return NextResponse.json({ error: 'חסר FEN או שאלה.' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const userMessage = [
    `רצף המהלכים עד העמדה (SAN): ${sanPath.filter(Boolean).join(' ') || '(עמדת הפתיחה)'}`,
    `FEN: ${fen}`,
    `מידע מנוע: לא זמין — אל תמציא הערכות מספריות או וריאציות טקטיות.`,
    '',
    `שאלת המשתמש: ${question.trim()}`,
    '',
    'ענה בעברית, בקצרה ולעניין, על בסיס עקרונות אסטרטגיים בלבד.',
  ].join('\n');

  try {
    const msg = await client.messages.create({
      model: ASK_MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    const answer = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    return NextResponse.json(
      { error: `שגיאה בפנייה למודל: ${message}` },
      { status: 502 },
    );
  }
}
