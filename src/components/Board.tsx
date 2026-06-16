'use client';

// Thin wrapper around react-chessboard (v4 API). Loaded client-side only
// (react-chessboard touches `window`), oriented for White, read-only —
// navigation happens through the move tree. White + bright-blue board theme.
//
// dir="ltr" on the wrapper: the page is RTL (Hebrew), which would otherwise
// mirror the board's file coordinates (a–h running right-to-left). Forcing LTR
// keeps files a→h left-to-right as they should be from White's side.
//
// We measure the container and pass an explicit, integer `boardWidth` so the
// board stays perfectly square at any container size.

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false },
);

export default function Board({ fen }: { fen: string }) {
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
    <div className="board" ref={ref} dir="ltr">
      {width > 0 && (
        <Chessboard
          position={fen}
          boardOrientation="white"
          arePiecesDraggable={false}
          id="repertoire-board"
          boardWidth={width}
          animationDuration={0}
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
