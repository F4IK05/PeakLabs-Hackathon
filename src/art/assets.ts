import type { Move } from '@/game/RockPaperScissors';
export const assets = {
  background: '/art/bar-empty.png',
  glass: '/art/shot-closed.png', empty: '/art/shot-empty.png', alcohol: '/art/shot-alcohol.png', water: '/art/shot-water.png',
  panel: '/art/ui-panel.png', selectedPanel: '/art/ui-panel-active.png',
  token: '/art/token-full.png', depleted: '/art/token-empty.png',
};
export const handAsset = (move: Move | 'reach', opponent = false) => `/art/${opponent ? 'opponent' : 'player'}-${move}.png`;
export const drinkFrameAsset = (frame: number, opponent = false) => `/art/${opponent ? 'opponent' : 'player'}-drink-${frame}.png`;
export const gestureFrameAsset = (move: Move, opponent = false) => `/art/whole-gesture-${(['rock', 'scissors', 'paper'] as const).indexOf(move) + (opponent ? 4 : 0)}.png`;
export const actorAssets = [...Array.from({ length: 8 }, (_, i) => drinkFrameAsset(i)), ...Array.from({ length: 8 }, (_, i) => drinkFrameAsset(i, true)), ...Array.from({ length: 8 }, (_, i) => `/art/whole-gesture-${i}.png`)];
export interface SceneShot { x: number; y: number }
export function sceneShots(count: number, width: number, height: number): SceneShot[] {
  const columns = Math.min(count, 6); const spacing = Math.min(51, (width - 70) / columns);
  const rows = Math.ceil(count / columns);
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / columns); const rowCount = Math.min(columns, count - row * columns);
    return { x: width / 2 + (i % columns - (rowCount - 1) / 2) * spacing, y: height * (height / width > 1.3 ? .79 : .69) + (row - (rows - 1) / 2) * 40 };
  });
}
