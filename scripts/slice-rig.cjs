const sharp = require('sharp');
(async () => {
  const image = sharp('public/art/body-rig-atlas.png');
  const { width, height } = await image.metadata();
  const cw = Math.floor(width / 2), ch = Math.floor(height / 2);
  for (const [i, name] of ['body-idle', 'body-lean'].entries()) {
    // Preserve alignment between the two poses; do not trim each body separately.
    await image.clone().extract({ left: i * cw, top: 0, width: cw, height: ch }).resize(384, 256, { kernel: 'nearest' }).png().toFile(`public/art/${name}.png`);
  }
  for (const [i, name] of ['arm-upper', 'arm-lower'].entries()) {
    const extracted = await image.clone().extract({ left: i * cw, top: ch, width: cw, height: ch }).png().toBuffer();
    const buffer = await sharp(extracted).trim({ background: '#00000000', threshold: 45 }).png().toBuffer();
    await sharp(buffer).resize(64, 160, { fit: 'fill', kernel: 'nearest' }).png().toFile(`public/art/${name}.png`);
  }
  console.log('Exported aligned body poses and sleeve bones.');
})().catch(error => { console.error(error); process.exitCode = 1; });
