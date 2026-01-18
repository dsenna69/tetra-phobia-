
export enum TetrominoType {
  I = 'I',
  J = 'J',
  L = 'L',
  O = 'O',
  S = 'S',
  T = 'T',
  Z = 'Z',
  GLITCH = 'GLITCH'
}

export type Point = {
  x: number;
  y: number;
};

export type Piece = {
  pos: Point;
  shape: number[][];
  color: string;
  type: TetrominoType;
};

export type GameStatus = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface Whisper {
  id: string;
  text: string;
  timestamp: number;
}
