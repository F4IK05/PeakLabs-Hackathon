const sharp = require('sharp');
const fs = require('node:fs');
(async () => {
  const bounds = {};
  for (const prefix of ['player-drink', 'whole-gesture']) {
    for (let i=0; i<(prefix==='player-drink'?8:4); i++) {
      const name=`${prefix}-${i}`;
      const {data,info}=await sharp(`public/art/${name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      let left=info.width,top=info.height,right=0,bottom=0;
      for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
        if(data[(y*info.width+x)*4+3]>8) {
          left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x); bottom=Math.max(bottom,y);
        }
      }
      const width=right-left+1,height=bottom-top+1,url=`/art/${name}-trimmed.png`;
      await sharp(`public/art/${name}.png`).extract({left,top,width,height}).png().toFile(`public${url}`);
      bounds[`/art/${name}.png`]={left,top,width,height,url};
    }
  }
  fs.writeFileSync('src/art/playerBounds.json',JSON.stringify(bounds,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
