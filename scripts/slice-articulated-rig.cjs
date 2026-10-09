const sharp = require('sharp');
const parts = [
  ['body',0,0,395,395],['upper',397,100,336,280],['fore',738,195,348,187],['rest',1117,190,330,190],
  ['rock',24,478,315,214],['scissors',375,497,355,195],['paper',742,460,345,239],['grip',1118,456,330,241],
  ['empty',24,757,306,264],['sip',374,750,354,276],['sip-empty',734,750,354,276],['shadow',1100,730,348,350],
];
(async()=>{
  for(const [name,left,top,width,height] of parts) {
    const part=await sharp(['upper','fore'].includes(name) ? 'public/art/articulated-rig-atlas-v2.png' : 'public/art/articulated-rig-atlas.png').extract({left,top,width,height}).png().toBuffer();
    await sharp(part).trim({background:'#00000000',threshold:8}).resize({width:256,kernel:'nearest'}).png().toFile(`public/art/rig-${name}.png`);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});


