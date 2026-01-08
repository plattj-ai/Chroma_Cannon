
import { ColorDefinition } from './types';

export const COLORS: ColorDefinition[] = [
  { name: 'Red', hex: '#FF0000', compIndex: 1 },    // Complementary: Green
  { name: 'Green', hex: '#00FF00', compIndex: 0 },  // Complementary: Red
  { name: 'Blue', hex: '#0000FF', compIndex: 3 },   // Complementary: Orange
  { name: 'Orange', hex: '#FFA500', compIndex: 2 }, // Complementary: Blue
  { name: 'Yellow', hex: '#FFFF00', compIndex: 5 }, // Complementary: Purple
  { name: 'Purple', hex: '#800080', compIndex: 4 }, // Complementary: Yellow
];

export const CANNON_WIDTH = 60;
export const CANNON_HEIGHT = 40;
export const BULLET_SIZE = 12;
export const ENEMY_SIZE = 40;
export const BULLET_SPEED = 8;
// Original was 1.5. Reduced by 25%: 1.5 * 0.75 = 1.125
export const INITIAL_ENEMY_SPEED = 1.125;
export const SPAWN_RATE_INCREASE = 0.05;
export const INITIAL_SPAWN_COOLDOWN = 80;
