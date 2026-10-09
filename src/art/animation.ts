import type { Phase } from '@/game/GameEngine';

// One timeline drives both rendering and state transitions, before speed scaling.
export const phaseDuration: Partial<Record<Phase, number>> = { clash: 1600, drinking: 3600, reveal: 1900, roundEnd: 1800, gameOver: 1900 };
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export interface Point { x: number; y: number }
export function opponentHand(shotX: number, centerX: number) {
  return shotX < centerX ? 'screen-left' : 'screen-right';
}
// Similarity transform: the painted arm keeps its proportions and its shoulder stays fixed.
export function anchoredArm(shoulder: Point, glass: Point, target: Point) {
  const dx = glass.x - shoulder.x, dy = glass.y - shoulder.y;
  const tx = target.x - shoulder.x, ty = target.y - shoulder.y;
  return { angle: Math.atan2(ty, tx) - Math.atan2(dy, dx), scale: Math.hypot(tx, ty) / Math.hypot(dx, dy) };
}
export const mixPoint = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * smooth(t), y: a.y + (b.y - a.y) * smooth(t) });
export function drinkFrame(progress: number) {
  const limits = [.1, .2, .3, .48, .58, .68, .86];
  const index = limits.findIndex(limit => progress < limit);
  return index < 0 ? 7 : index;
}
export const frameHasGlass = (index: number, _opponent = false) => index >= 2 && index <= 6;
export function solveArm(shoulder: Point, wrist: Point, upperLength: number, foreLength: number, bend: number) {
  const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
  const distance = Math.max(Math.abs(upperLength - foreLength) + .001, Math.min(upperLength + foreLength - .001, Math.hypot(dx, dy)));
  const along = (upperLength * upperLength - foreLength * foreLength + distance * distance) / (2 * distance);
  const across = Math.sqrt(Math.max(0, upperLength * upperLength - along * along)) * bend;
  const angle = Math.atan2(dy, dx);
  const elbow = { x: shoulder.x + along * Math.cos(angle) - across * Math.sin(angle), y: shoulder.y + along * Math.sin(angle) + across * Math.cos(angle) };
  const end = { x: shoulder.x + distance * Math.cos(angle), y: shoulder.y + distance * Math.sin(angle) };
  return { elbow, wrist: end };
}
export const playerGlassPivot: Point[] = [{ x: .46, y: .43 }, { x: .46, y: .43 }, { x: .36, y: .36 }, { x: .28, y: .23 }, { x: .43, y: .26 }, { x: .43, y: .26 }, { x: .33, y: .36 }, { x: .43, y: .4 }];
export function drinkPose(progress: number, origin: Point, shot: Point, mouth: Point) {
  const t = clamp(progress);
  let grip: Point; let stage: 'reach' | 'grasp' | 'lift' | 'sip' | 'return' | 'release' | 'retract';
  if (t < .2) { stage = 'reach'; grip = mixPoint(origin, shot, t / .2); }
  else if (t < .3) { stage = 'grasp'; grip = shot; }
  else if (t < .48) { stage = 'lift'; grip = mixPoint(shot, mouth, (t - .3) / .18); }
  else if (t < .68) { stage = 'sip'; grip = mouth; }
  else if (t < .86) { stage = 'return'; grip = mixPoint(mouth, shot, (t - .68) / .18); }
  else if (t < .94) { stage = 'release'; grip = shot; }
  else { stage = 'retract'; grip = mixPoint(shot, origin, (t - .94) / .06); }
  const tilt = smooth((t - .46) / .09) * (1 - smooth((t - .66) / .08));
  return { grip, stage, carrying: frameHasGlass(drinkFrame(t)), tableVisible: !frameHasGlass(drinkFrame(t)), emptied: t >= .58, tilt, swallowed: smooth((t - .54) / .1), proximity: smooth((t - .3) / .18) * (1 - smooth((t - .68) / .18)) };
}
