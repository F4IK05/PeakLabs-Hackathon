import type { Move } from '@/game/RockPaperScissors';
import playerBounds from './playerBounds.json';
export const assets = {
  background: '/art/bar-empty.png',
  glass: '/art/shot-closed.png', empty: '/art/shot-empty.png', alcohol: '/art/shot-alcohol.png', water: '/art/shot-water.png',
  panel: '/art/ui-panel.png', selectedPanel: '/art/ui-panel-active.png',
  token: '/art/token-full.png', depleted: '/art/token-empty.png',
  rigBody: '/art/rig-body.png', rigUpper: '/art/sleeve-upper-v4.png', rigFore: '/art/sleeve-fore-v4.png', rigElbow: '/art/sleeve-elbow-v4.png',
  rigRest: '/art/rig-rest.png', rigRock: '/art/rig-rock.png', rigScissors: '/art/rig-scissors.png', rigPaper: '/art/rig-paper.png',
  rigGrip: '/art/rig-grip.png', rigEmpty: '/art/rig-empty.png', rigSip: '/art/rig-sip.png', rigSipEmpty: '/art/rig-sip-empty.png',
  rigShadow: '/art/rig-shadow.png',
};
export const handAsset = (move: Move | 'reach', opponent = false) => `/art/${opponent ? 'opponent' : 'player'}-${move}.png`;
export const drinkFrameAsset = (frame: number, opponent = false) => `/art/${opponent ? 'opponent' : 'player'}-drink-${frame}.png`;
export const gestureFrameAsset = (move: Move, opponent = false) => `/art/whole-gesture-${(['rock', 'scissors', 'paper'] as const).indexOf(move) + (opponent ? 4 : 0)}.png`;
export const paintedFrame = (name: string, frame: number) => `/art/painted-${name}-${frame}.png`;
export const actorAssets = [...Array.from({ length: 8 }, (_, i) => drinkFrameAsset(i)), ...Array.from({ length: 8 }, (_, i) => `/art/whole-gesture-${i}.png`), ...['poses','outer','inner','center','gesture'].flatMap(name=>Array.from({length:8},(_,i)=>paintedFrame(name,i))), ...Object.values(playerBounds).map(frame => frame.url)];
export function opponentLayout(width: number, height: number) {
  const bgHeight = Math.max(height, width * 941 / 1672);
  const tableEdge = (height-bgHeight)/2 + bgHeight*.552;
  const size = Math.min(bgHeight*.62,width*.92);
  return { size, x:width/2-size/2, y:tableEdge-size*.77, tableEdge };
}
export interface SceneShot { x: number; y: number }
export function sceneShots(count: number, width: number, height: number): SceneShot[] {
  if (count <= 0) return [];
  const columns = Math.min(count, 5);
  const layout = opponentLayout(width,height);
  const spacing = Math.min(layout.size * .21, (width - 72) / Math.max(1, columns - 1));
  const firstY = layout.tableEdge + layout.size * .07;
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / columns); const rowCount = Math.min(columns, count - row * columns);
    return { x: width / 2 + (i % columns - (rowCount - 1) / 2) * spacing, y: firstY + row * 48 };
  });
}

