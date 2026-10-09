// Lossless atlas slicing, transparent trimming and nearest-neighbour export.
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
async function slice(file, names, panelIndices = []) {
  const image = sharp(file); const meta = await image.metadata();
  const cellW = Math.floor(meta.width / 4), cellH = Math.floor(meta.height / 2);
  console.log(path.basename(file), meta.width, meta.height, 'channels', meta.channels);
  for (let i = 0; i < names.length; i++) {
    const extracted = await image.clone().extract({ left: i % 4 * cellW, top: Math.floor(i / 4) * cellH, width: cellW, height: cellH }).png().toBuffer();
    const trimmed = await sharp(extracted).trim({ background: '#00000000', threshold: 10 }).png().toBuffer();
    await sharp(trimmed).resize(panelIndices.includes(i) ? 256 : 96, panelIndices.includes(i) ? 112 : 96, { fit: 'contain', background: '#00000000', kernel: 'nearest' }).png().toFile(`public/art/${names[i]}.png`);
  }
}
(async () => {
  fs.mkdirSync('public/art', { recursive: true });
  await slice('public/art/hands-atlas.png', ['player-rock', 'player-scissors', 'player-paper', 'player-reach', 'opponent-rock', 'opponent-scissors', 'opponent-paper', 'opponent-reach']);
  await slice('public/art/props-atlas.png', ['shot-closed', 'shot-empty', 'shot-alcohol', 'shot-water', 'ui-panel', 'ui-panel-active', 'token-full', 'token-empty'], [4, 5]);
})().catch(error => { console.error(error); process.exitCode = 1; });
