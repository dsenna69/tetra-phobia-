
import { TetrominoType } from './types';

export const COLS = 10;
export const ROWS = 20;
export const INITIAL_DROP_SPEED = 800;
export const MIN_DROP_SPEED = 100;

export const SHAPES: Record<TetrominoType, number[][]> = {
  [TetrominoType.I]: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  [TetrominoType.J]: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  [TetrominoType.L]: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  [TetrominoType.O]: [[1, 1], [1, 1]],
  [TetrominoType.S]: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  [TetrominoType.T]: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  [TetrominoType.Z]: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  [TetrominoType.GLITCH]: [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
};

export const COLORS: Record<TetrominoType, string> = {
  [TetrominoType.I]: 'bg-cyan-900 shadow-cyan-500/50',
  [TetrominoType.J]: 'bg-blue-900 shadow-blue-500/50',
  [TetrominoType.L]: 'bg-orange-900 shadow-orange-500/50',
  [TetrominoType.O]: 'bg-yellow-900 shadow-yellow-500/50',
  [TetrominoType.S]: 'bg-green-900 shadow-green-500/50',
  [TetrominoType.T]: 'bg-purple-900 shadow-purple-500/50',
  [TetrominoType.Z]: 'bg-red-900 shadow-red-500/50',
  [TetrominoType.GLITCH]: 'bg-zinc-100 shadow-zinc-500/50 animate-pulse',
};
