// Client-safe repertoire metadata (no fs imports), shared by the UI.

export type RepId = 'white' | 'black';

export interface RepMeta {
  id: RepId;
  /** Short label for the toggle. */
  label: string;
  /** Board orientation: you play this side. */
  orientation: 'white' | 'black';
  /** The "hero" side whose repertoire this is. */
  heroSide: 'w' | 'b';
}

export const REP_META: RepMeta[] = [
  { id: 'white', label: 'לבן · ז׳ובבה לונדון', orientation: 'white', heroSide: 'w' },
  { id: 'black', label: 'שחור · קארו־קאן / סלאב', orientation: 'black', heroSide: 'b' },
];
