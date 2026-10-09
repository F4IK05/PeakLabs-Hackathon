import { assets } from './assets';
import { solveArm, smooth, type Point } from './animation';

interface RigArm {
  shoulder: Point; target: Point; upper: number; fore: number; side: number;
  hand: string; handSize: number; handTilt: number; carrying: boolean;
  tableEdge: number;
  facing: number;
}
const motion = new WeakMap<CanvasRenderingContext2D, Map<number,{upper:number; bend:number; time:number}>>();

export function drawRigArm(c: CanvasRenderingContext2D, images: Record<string, HTMLImageElement>, arm: RigArm, layer: 'upper' | 'fore' = 'fore') {
  const handImage = images[arm.hand];
  if (!handImage) return;
  const handW = arm.handSize;
  const handH = handW * handImage.height / handImage.width;
  const handSide=arm.facing;
  const handAngle=arm.handTilt;
  const offset={x:handW*(arm.carrying?.70:.40),y:arm.carrying?-handH*.10:0};
  const dx=offset.x*Math.cos(handAngle)-offset.y*Math.sin(handAngle);
  const dy=offset.x*Math.sin(handAngle)+offset.y*Math.cos(handAngle);
  const wrist={x:arm.target.x-dx*handSide,y:arm.target.y-dy};
  const desired=solveArm(arm.shoulder,wrist,arm.upper,arm.fore,arm.side);
  const upperAngle=Math.max(-.35,Math.min(2.8,Math.atan2(desired.elbow.y-arm.shoulder.y,(desired.elbow.x-arm.shoulder.x)*arm.side)));
  const foreAngle=Math.atan2(desired.wrist.y-desired.elbow.y,(desired.wrist.x-desired.elbow.x)*arm.side);
  const relative=Math.atan2(Math.sin(foreAngle-upperAngle),Math.cos(foreAngle-upperAngle));
  const bend=Math.max(-2.65,Math.min(-.10,relative));
  let arms=motion.get(c); if(!arms){arms=new Map();motion.set(c,arms);}
  const now=performance.now(),previous=arms.get(arm.side);
  const amount=previous?1-Math.exp(-Math.min(50,now-previous.time)/65):1;
  const pose={upper:previous?previous.upper+(upperAngle-previous.upper)*amount:upperAngle,bend:previous?previous.bend+(bend-previous.bend)*amount:bend,time:now};
  arms.set(arm.side,pose);
  const elbow={x:arm.shoulder.x+Math.cos(pose.upper)*arm.upper*arm.side,y:arm.shoulder.y+Math.sin(pose.upper)*arm.upper};
  const joints={elbow,wrist:{x:elbow.x+Math.cos(pose.upper+pose.bend)*arm.fore*arm.side,y:elbow.y+Math.sin(pose.upper+pose.bend)*arm.fore}};
  const shadow = images[assets.rigShadow];
  if (shadow && layer==='fore') {
    c.save(); c.filter = 'none'; c.globalAlpha = .25;
    c.beginPath(); c.rect(-1000,arm.tableEdge,3000,3000); c.clip();
    for (const [from,to] of [[arm.shoulder,joints.elbow],[joints.elbow,joints.wrist]]) {
      const x=(from.x+to.x)/2,y=Math.max(arm.tableEdge+3,(from.y+to.y)/2+10);
      c.drawImage(shadow,x-25,y-6,50,12);
    }
    c.restore();
  }
  const segment = (url: string, from: Point, to: Point, length: number) => {
    const image = images[url]; if (!image) return;
    // Pivots are at the centres of the rounded cloth ends, not at the image edges.
    const endRatio=.8;
    const scale=length/(image.width-image.height*endRatio);
    const width=image.width*scale,height=image.height*scale;
    c.save(); c.translate(from.x, from.y); c.rotate(Math.atan2(to.y-from.y,to.x-from.x));
    c.scale(1,arm.side);
    c.drawImage(image,-height/2,-height/2,width,height); c.restore();
  };
  // Each sleeve has fixed dimensions for the whole animation. Only joint angles change.
  if(layer==='upper') { segment(assets.rigUpper,arm.shoulder,joints.elbow,arm.upper); return joints; }
  segment(assets.rigFore, joints.elbow, joints.wrist, arm.fore);
  const cap=images[assets.rigElbow];
  if(cap) {
    const diameter=arm.upper*.40;
    c.drawImage(cap,joints.elbow.x-diameter/2,joints.elbow.y-diameter/2,diameter,diameter);
  }
  c.save(); c.translate(joints.wrist.x,joints.wrist.y); c.scale(handSide,1); c.rotate(handAngle);
  c.drawImage(handImage,-handW*.07,-handH*.52,handW,handH); c.restore();
  return joints;
}

export function sipTilt(progress: number) {
  return -.65 * smooth((progress-.46)/.09) * (1-smooth((progress-.66)/.08));
}



