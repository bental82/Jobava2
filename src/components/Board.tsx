'use client';

// Thin wrapper around react-chessboard (v4 API). Loaded client-side only
// (react-chessboard touches `window`), oriented for White, read-only —
// navigation happens through the move tree. Renders a colored arrow for the
// move that led to the current position (green/orange/red by quality), and
// uses a white + bright-blue board theme.

import dynamic from 'next/dynamic';
import type { Arrow as RcArrow } from 'react-chessboard/dist/chessboard/types';

const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false },
);

type Arrow = [string, string, string?];

export default function Board({ fen, arrows = [] }: { fen: string; arrows?: Arrow[] }) {
  return (
    <div className="board">
      <Chessboard
        position={fen}
        boardOrientation="white"
        arePiecesDraggable={false}
        id="repertoire-board"
        animationDuration={0}
        customArrows={arrows as unknown as RcArrow[]}
        customLightSquareStyle={{ backgroundColor: '#e8eef7' }}
        customDarkSquareStyle={{ backgroundColor: '#3f86d6' }}
        customBoardStyle={{
          borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}
      />
    </div>
  );
}
