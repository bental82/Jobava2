'use client';

// Thin wrapper around react-chessboard (v4 API). The board is loaded
// client-side only (react-chessboard touches `window`), oriented for White.
// It is read-only here: navigation happens through the move tree, not by
// dragging pieces.

import dynamic from 'next/dynamic';

const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false },
);

export default function Board({ fen }: { fen: string }) {
  return (
    <div className="board">
      <Chessboard
        position={fen}
        boardOrientation="white"
        arePiecesDraggable={false}
        id="repertoire-board"
        customBoardStyle={{
          borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}
      />
    </div>
  );
}
