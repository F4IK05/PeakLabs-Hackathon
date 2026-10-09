const sharp = require('sharp');
async function frames(file, prefix, count = 8, actorOffset = 0) {
  const meta = await sharp(file).metadata(); const cw = Math.floor(meta.width / 4), ch = Math.floor(meta.height / 2);
  for (let i = 0; i < count; i++) {
    const buffer = await sharp(file).extract({ left: i % 4 * cw, top: Math.floor(i / 4) * ch, width: cw, height: ch }).resize(256, 256, { kernel: 'nearest' }).png().toBuffer();
    if (actorOffset && i >= 4) {
      const top = await sharp(buffer).extract({ left: 0, top: 0, width: 256, height: 256 - actorOffset }).png().toBuffer();
      await sharp({ create: { width: 256, height: 256, channels: 4, background: '#00000000' } }).composite([{ input: top, top: actorOffset, left: 0 }]).png().toFile(`public/art/${prefix}-${i}.png`);
    } else await sharp(buffer).png().toFile(`public/art/${prefix}-${i}.png`);
  }
}
(async () => {
  await frames('public/art/player-drink-atlas.png', 'player-drink');
  await frames('public/art/opponent-drink-atlas.png', 'opponent-drink');
  await frames('public/art/whole-gesture-atlas.png', 'whole-gesture', 8, 23);
  console.log('Exported 24 complete painted frames, preserving transparent cell alignment.');
})().catch(error => { console.error(error); process.exitCode = 1; });
