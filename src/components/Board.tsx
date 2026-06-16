'use client';

// Thin wrapper around react-chessboard (v4 API). Loaded client-side only
// (react-chessboard touches `window`), oriented for White, read-only —
// navigation happens through the move tree. Renders a colored arrow for the
// move that led to the current position (green/orange/red by quality), and
// uses a white + bright-blue board theme.
//
// We measure the container and pass an explicit, integer `boardWidth`: the
// arrow overlay's geometry is computed from boardWidth, so it MUST match the
// rendered square size exactly — otherwise arrows land off-centre and look
// skewed. Measuring ourselves keeps the board perfectly square and the arrows
// aligned at any container size.

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { Arrow as RcArrow } from 'react-chessboard/dist/chessboard/types';

const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false },
);

type Arrow = [string, string, string?];

export default function Board({ fen, arrows = [] }: { fen: string; arrows?: Arrow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.floor(el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="board" ref={ref}>
      {width > 0 && (
        <Chessboard
          position={fen}
          boardOrientation="white"
          arePiecesDraggable={false}
          id="repertoire-board"
          boardWidth={width}
          animationDuration={0}
          customArrows={arrows as unknown as RcArrow[]}
          customLightSquareStyle={{ backgroundColor: '#e8eef7' }}
          customDarkSquareStyle={{ backgroundColor: '#3f86d6' }}
          customBoardStyle={{
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}
        />
      )}
    </div>
  );
}
