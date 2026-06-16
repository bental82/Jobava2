'use client';

// Optional "Ask about this position" box. Sends the current FEN + line context
// to the server-side /api/ask route, which calls Claude. Degrades gracefully:
// if ANTHROPIC_API_KEY is not configured, the route returns a friendly error
// and nothing else breaks.

import { useState } from 'react';

interface Props {
  fen: string;
  sanPath: string[];
}

export default function AskBox({ fen, sanPath }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, sanPath, question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'אירעה שגיאה.');
      } else {
        setAnswer(data.answer);
      }
    } catch {
      setError('שגיאת רשת. נסו שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel-section ask-box">
      <h2 className="panel-heading">שאלה על העמדה</h2>
      <textarea
        className="ask-input"
        rows={2}
        placeholder="שאלו שאלת המשך על העמדה הזו…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask();
        }}
      />
      <button type="button" className="ask-button" onClick={ask} disabled={loading}>
        {loading ? 'חושב…' : 'שאל'}
      </button>
      {error && <p className="ask-error">{error}</p>}
      {answer && <p className="ask-answer">{answer}</p>}
    </section>
  );
}
