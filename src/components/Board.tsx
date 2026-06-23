'use client';

// Thin wrapper around react-chessboard (v4 API). Client-only (it touches
// `window`), read-only — navigation happens through the move chips/tree.
//
// dir="ltr" on the wrapper: the page is RTL (Hebrew), which would otherwise
// mirror the board's file coordinates. We also measure the container and pass
// an explicit integer boardWidth so the board stays perfectly square.

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false },
);

export default function Board({
  fen,
  orientation = 'white',
}: {
  fen: string;
  orientation?: 'white' | 'black';
}) {
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
          boardOrientation={orientation}
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
