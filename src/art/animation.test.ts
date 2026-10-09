import { expect, it } from 'vitest';
import { opponentHand, drinkFrame, drinkPose, frameHasGlass } from './animation';
import { opponentLayout, sceneShots } from './assets';
import { armOffset, opponentPose } from './opponentPose';
const origin = { x: 50, y: 300 }, shot = { x: 200, y: 190 }, mouth = { x: 250, y: 90 };
it('selects the side nearest the shot', () => {
  expect(opponentHand(100, 200)).toBe('screen-left');
  expect(opponentHand(300, 200)).toBe('screen-right');
});
it('centres straight rows with equal spacing for every supported shot count', () => {
  expect(sceneShots(0,480,270)).toEqual([]);
  for(const [width,height] of [[480,270],[480,1040],[800,270]]) for(let count=1;count<=12;count++) {
    const shots=sceneShots(count,width,height);
    for(let start=0;start<count;start+=5) {
      const row=shots.slice(start,start+5);
      expect((row[0].x+row[row.length-1].x)/2).toBeCloseTo(width/2);
      for(let i=1;i<row.length;i++) {
        expect(row[i].y).toBe(row[0].y);
        expect(row[i].x-row[i-1].x).toBeCloseTo(row[1].x-row[0].x);
      }
    }
  }
});
it('registers grasp and return cels to every shot without moving the head', () => {
  for(const [width,height] of [[480,270],[480,1040],[800,270]]) for(let count=1;count<=12;count++) {
    const layout=opponentLayout(width,height);
    for(const shot of sceneShots(count,width,height)) for(const frame of [2,6]) {
      const pose=opponentPose(shot,layout,frame);
      const grip=armOffset(pose.grip,pose.offset);
      const x=layout.x+(pose.flip?256-grip.x:grip.x)/256*layout.size;
      const y=layout.y+grip.y/256*layout.size;
      expect(x).toBeCloseTo(shot.x);
      expect(y).toBeCloseTo(shot.y+3);
      expect(armOffset({x:128,y:32},pose.offset)).toEqual({x:128,y:32});
    }
  }
});
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
  expect(frameHasGlass(1, true)).toBe(false);
  expect(frameHasGlass(1, false)).toBe(false);
  expect(frameHasGlass(7, true)).toBe(false);
});
it('keeps every shot inside the viewport and uses the same seated actor layout', () => {
  for(const [width,height] of [[480,300],[480,1040],[800,270]]) {
    const actor=opponentLayout(width,height);
    expect(actor.x+actor.size/2).toBeCloseTo(width/2);
    for(const count of [1,2,3,4,5,10]) {
      const shots=sceneShots(count,width,height);
      expect(shots).toHaveLength(count);
      for(const shot of shots) {expect(shot.x).toBeGreaterThan(18);expect(shot.x).toBeLessThan(width-18);}
      expect(opponentLayout(width,height)).toEqual(actor);
    }
  }
});
