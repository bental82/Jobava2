'use client';

// Live engine panel: an opt-in toggle that spins up single-threaded Stockfish
// (WASM, Web Worker) and shows an eval bar + top candidate lines for the
// current position. Off by default so we don't spawn a worker for visitors who
// only want to read the rationale.

import { useEffect, useRef, useState } from 'react';
import { BrowserEngine } from '@/lib/engineBrowser';
import type { EngineAnalysis, EngineLine } from '@/lib/engine';

/** Logistic win-probability-ish fill fraction (0..1) for White from an eval. */
function whiteFraction(line: EngineLine | undefined): number {
  if (!line) return 0.5;
  if (line.mateIn !== null) return line.mateIn >= 0 ? 1 : 0;
  if (line.scoreCp === null) return 0.5;
  return 1 / (1 + Math.pow(10, -line.scoreCp / 400));
}

function evalText(line: EngineLine | undefined): string {
  if (!line) return '0.00';
  if (line.mateIn !== null) return `מט ${Math.abs(line.mateIn)}`;
  if (line.scoreCp === null) return '0.00';
  const p = line.scoreCp / 100;
  return (p >= 0 ? '+' : '') + p.toFixed(2);
}

export default function EnginePanel({ fen }: { fen: string }) {
  const [enabled, setEnabled] = useState(false);
  const [analysis, setAnalysis] = useState<EngineAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const engineRef = useRef<BrowserEngine | null>(null);

  // Create / tear down the engine when toggled.
  useEffect(() => {
    if (!enabled) return;
    const engine = new BrowserEngine({ depth: 16, multiPv: 3 });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [enabled]);

  // Analyze the current position whenever it (or enabled) changes.
  useEffect(() => {
    if (!enabled) {
      setAnalysis(null);
      return;
    }
    const engine = engineRef.current;
    if (!engine) return;
    let stale = false;
    setLoading(true);
    engine.analyze(fen).then((result) => {
      if (stale) return;
      if (result) setAnalysis(result);
      setLoading(false);
    });
    return () => {
      stale = true;
    };
  }, [fen, enabled]);

  const top = analysis?.lines[0];
  const frac = whiteFraction(top);

  return (
    <section className="panel-section engine-panel">
      <div className="engine-header">
        <h2 className="panel-heading">הערכת מנוע</h2>
        <button
          type="button"
          className="engine-toggle"
          onClick={() => setEnabled((v) => !v)}
        >
          {enabled ? 'כבה מנוע' : 'הפעל מנוע (Stockfish)'}
        </button>
      </div>

      {!enabled && (
        <p className="engine-disabled">המנוע כבוי. הפעילו כדי לראות הערכה ומהלכים מובילים.</p>
      )}

      {enabled && (
        <>
          <div className="eval-row" dir="ltr">
            <div className="eval-bar" aria-hidden>
              <div className="eval-bar-white" style={{ width: `${frac * 100}%` }} />
            </div>
            <span className="eval-number">{analysis ? evalText(top) : '…'}</span>
          </div>

          {analysis && analysis.lines.length > 0 ? (
            <ol className="engine-lines" dir="ltr">
              {analysis.lines.map((line, i) => (
                <li key={i} className="engine-line">
                  <span className="engine-line-eval">{evalText(line)}</span>
                  <span className="engine-line-pv">{line.pv.slice(0, 6).join(' ')}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="engine-disabled">{loading ? 'מחשב…' : 'אין נתונים.'}</p>
          )}
          {analysis && (
            <p className="engine-depth" dir="ltr">
              depth {analysis.depth}
            </p>
          )}
        </>
      )}
    </section>
  );
}
