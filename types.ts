
export enum GameState {
  START_SCREEN = 'START_SCREEN',
  PLAYING = 'PLAYING',
  CRASHED = 'CRASHED',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export interface ColorDefinition {
  name: string;
  hex: string;
  compIndex: number;
}

export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bullet extends Entity {
  colorIndex: number;
}

export interface Enemy extends Entity {
  colorIndex: number;
  speed: number;
}
