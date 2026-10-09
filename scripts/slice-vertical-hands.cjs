const sharp=require('sharp');
(async()=>{
  const image='public/art/vertical-hands-atlas.png';
  const meta=await sharp(image).metadata();
  const cw=Math.floor(meta.width/4),ch=Math.floor(meta.height/2);
  for(const [i,name] of ['rest','rock','scissors','paper','grip','empty','sip','sip-empty'].entries()) {
    const cell=await sharp(image).extract({left:i%4*cw,top:Math.floor(i/4)*ch,width:cw,height:ch}).png().toBuffer();
    await sharp(cell).trim({background:'#00000000',threshold:8}).resize({width:256,kernel:'nearest'}).png().toFile(`public/art/hand-v3-${name}.png`);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
