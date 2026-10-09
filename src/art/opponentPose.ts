import { smooth, type Point } from './animation';

export function opponentPose(shot: Point, layout: { x: number; y: number; size: number }, frame: number) {
  const lane = (shot.x - layout.x) / layout.size;
  const flip = lane > .5 + .01;
  const handX = flip ? 1 - lane : lane;
  const sequence = Math.abs(lane - .5) < .07 ? 'center' : handX < .23 ? 'outer' : 'inner';
  const name = frame === 2 && sequence !== 'outer' ? 'poses' : sequence;
  const cel = name === 'poses' ? sequence === 'center' ? 3 : 2 : frame;
  // Glass centres measured in the registered 256px painted cels. Return cels
  // differ from grasp cels, so each is registered to the same table position.
  const gripX = sequence === 'outer' ? 18 : sequence === 'center' ? (frame === 2 ? 134 : 112) : (frame === 2 ? 98 : 94);
  const gripY = sequence === 'outer' ? 218 : sequence === 'center' ? (frame === 2 ? 204 : 214) : (frame === 2 ? 203 : 215);
  const amount = frame === 1 || frame === 2 || frame === 6 ? 1 : frame === 3 ? .5 : 0;
  const target = { x: handX * 256, y: (shot.y + 3 - layout.y) / layout.size * 256 };
  return { name, cel, flip, target, grip: { x: gripX, y: gripY }, offset: { x: (target.x - gripX) * amount, y: (target.y - gripY) * amount } };
}

// Move the painted forearm toward the selected glass, fading the adjustment
// out at the shoulder and coat. The head and upper torso remain registered.
export function armOffset(point: Point, offset: Point): Point {
  const weight = smooth((point.y - 132) / 52) * (1 - smooth((point.x - 144) / 48));
  return { x: point.x + offset.x * weight, y: point.y + offset.y * weight };
}

export function paintAdjustedArm(image: HTMLImageElement, offset: Point) {
  const canvas = document.createElement('canvas');
  const padding = Math.max(32, Math.ceil(Math.max(Math.abs(offset.x), Math.abs(offset.y))) + 2);
  canvas.width = canvas.height = 256 + padding * 2;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(image,0,0,256,128,padding,padding,256,128);
  c.drawImage(image,192,128,64,128,padding+192,padding+128,64,128);
  const triangle = (a: Point, b: Point, d: Point) => {
    const p = armOffset(a, offset), q = armOffset(b, offset), r = armOffset(d, offset);
    const determinant = (b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y);
    const xx = ((q.x-p.x)*(d.y-a.y)-(r.x-p.x)*(b.y-a.y))/determinant;
    const xy = ((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(d.x-a.x))/determinant;
    const yx = ((q.y-p.y)*(d.y-a.y)-(r.y-p.y)*(b.y-a.y))/determinant;
    const yy = ((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(d.x-a.x))/determinant;
    c.save();
    // Slightly overlap adjacent clips to avoid antialiasing cracks in the mesh.
    const centre={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
    const expand=(v:Point)=>{const dx=v.x-centre.x,dy=v.y-centre.y,length=Math.hypot(dx,dy);return {x:v.x+dx/length*.6+padding,y:v.y+dy/length*.6+padding};};
    const u=expand(p),v=expand(q),z=expand(r);
    c.beginPath();c.moveTo(u.x,u.y);c.lineTo(v.x,v.y);c.lineTo(z.x,z.y);c.closePath();c.clip();
    c.setTransform(xx,yx,xy,yy,p.x+padding-xx*a.x-xy*a.y,p.y+padding-yx*a.x-yy*a.y);
    c.drawImage(image,0,0,256,256);c.restore();
  };
  for(let y=128;y<256;y+=16) for(let x=0;x<192;x+=16) {
    const a={x,y}, b={x:x+16,y}, d={x,y:y+16}, e={x:x+16,y:y+16};
    triangle(a,b,d);triangle(b,e,d);
  }
  return canvas;
}
