const sharp = require('sharp');
async function slice(name, source) {
  const meta = await sharp(source).metadata();
  const width = Math.floor(meta.width / 4), height = Math.floor(meta.height / 2);
  for (let i=0;i<8;i++) {
    const cell = await sharp(source).extract({left:i%4*width,top:Math.floor(i/4)*height,width,height}).resize(256,256,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
    let top=256,left=256,right=0;
    for(let y=0;y<100;y++) for(let x=92;x<164;x++) if(cell[(y*256+x)*4+3]>128) top=Math.min(top,y);
    for(let y=top;y<Math.min(top+35,256);y++) for(let x=70;x<186;x++) if(cell[(y*256+x)*4+3]>128) {left=Math.min(left,x);right=Math.max(right,x);}
    const dx=Math.round(128-(left+right)/2),dy=24-top;
    const image=await sharp(cell,{raw:{width:256,height:256,channels:4}}).png().toBuffer();
    const crop={left:Math.max(0,-dx),top:Math.max(0,-dy),width:256-Math.abs(dx),height:256-Math.abs(dy)};
    const aligned=await sharp(image).extract(crop).png().toBuffer();
    await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite([{input:aligned,left:Math.max(0,dx),top:Math.max(0,dy)}]).png().toFile(`public/art/painted-${name}-${i}.png`);
  }
}
(async()=>{for(const name of ['outer','inner','center','gesture']) await slice(name,`public/art/painted-${name}.png`);await slice('poses','public/art/opponent-painted-poses.png');})().catch(e=>{console.error(e);process.exitCode=1;});
