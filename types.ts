export type GameState = 'start' | 'playing' | 'gameover';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'confetti' | 'trail' | 'shatter';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  scale: number;
}
