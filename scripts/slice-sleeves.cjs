const sharp=require('sharp');
(async()=>{
  const file='public/art/sleeve-atlas-v4.png',meta=await sharp(file).metadata();
  const width=Math.floor(meta.width/2),height=Math.floor(meta.height/2);
  for(const [i,name] of ['upper','fore','elbow','shoulder'].entries()) {
    const cell=await sharp(file).extract({left:i%2*width,top:Math.floor(i/2)*height,width,height}).png().toBuffer();
    await sharp(cell).trim({background:'#00000000',threshold:8}).resize({width:256,kernel:'nearest'}).png().toFile(`public/art/sleeve-${name}-v4.png`);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
