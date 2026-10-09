import { expect, it } from 'vitest';
import { drinkFrame, drinkPose, frameHasGlass } from './animation';
const origin = { x: 50, y: 300 }, shot = { x: 200, y: 190 }, mouth = { x: 250, y: 90 };
it('grabs the glass at its actual position and returns it before releasing', () => {
  expect(drinkPose(.25, origin, shot, mouth).grip).toEqual(shot);
  expect(drinkPose(.55, origin, shot, mouth).grip).toEqual(mouth);
  expect(drinkPose(.89, origin, shot, mouth).grip).toEqual(shot);
  expect(drinkPose(1, origin, shot, mouth).grip).toEqual(origin);
});
it('glass never duplicates or disappears during its carrying interval', () => {
  for (let i = 0; i <= 100; i++) {
    const pose = drinkPose(i / 100, origin, shot, mouth);
    expect(Number(pose.carrying) + Number(pose.tableVisible)).toBe(1);
  }
  expect(drinkPose(.55, origin, shot, mouth).emptied).toBe(false);
  expect(drinkPose(.89, origin, shot, mouth).emptied).toBe(true);
});
it('all eight painted frames play in order without a second table glass', () => {
  const frames = Array.from({ length: 101 }, (_, i) => drinkFrame(i / 100));
  expect([...new Set(frames)]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(frameHasGlass(1, true)).toBe(true);
  expect(frameHasGlass(1, false)).toBe(false);
  expect(frameHasGlass(7, true)).toBe(false);
});
