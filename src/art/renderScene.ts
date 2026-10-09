import type { Game } from '@/game/GameEngine';
import { assets, drinkFrameAsset, gestureFrameAsset, sceneShots } from './assets';
import { clamp, drinkPose, drinkFrame, frameHasGlass, playerGlassPivot, phaseDuration, smooth } from './animation';

export function renderScene(canvas: HTMLCanvasElement, game: Game, size: { width: number; height: number }, images: Record<string, HTMLImageElement>, hover: { current: number | undefined }, clock: { current: { key: string; start: number } }) {
  const context = canvas.getContext('2d'); if (!context || !images[assets.background]) return () => {};
  const c = context;
  const key = `${game.phase}/${game.round}/${game.selected}/${game.playerMove}/${game.aiMove}`;
  if (clock.current.key !== key) clock.current = { key, start: performance.now() };
  let frame = 0;
  const { width: w, height: h } = size;
  const preview = game.phase === 'menu', canSelect = game.phase === 'select' && game.loser === 'player';
  const shots = preview ? Array.from({ length: 5 }, (_, id) => ({ id, used: false, alcohol: false })) : game.shots;
  const positions = sceneShots(shots.length, w, h), bg = images[assets.background];
  const scale = Math.max(w / bg.width, h / bg.height);
  const bgW = bg.width * scale, bgH = bg.height * scale, bgX = (w - bgW) / 2, bgY = (h - bgH) / 2;
  const sprite = (url: string, x: number, y: number, width: number, height = width) => {
    const image = images[url]; if (image && width > 0 && height > 0) c.drawImage(image, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  };
  function draw(now: number) {
    const elapsed = (now - clock.current.start) * game.settings.speed;
    const time = Math.floor(elapsed / 42) * 42;
    const idleTime = Math.floor(now / 125) / 8;
    const progress = clamp(time / (phaseDuration[game.phase] ?? 1));
    c.imageSmoothingEnabled = false;
    const selectedIndex = shots.findIndex(s => s.id === game.selected), selected = shots[selectedIndex], shotPos = positions[selectedIndex];
    const alcoholReveal = !!selected?.alcohol && ['reveal', 'gameOver'].includes(game.phase);
    const shake = alcoholReveal && game.loser === 'player' && progress < .35 ? Math.round(Math.sin(time * .07) * 2 * (1 - progress / .35)) : 0;
    c.clearRect(0, 0, w, h); c.save(); c.translate(shake, 0);
    c.drawImage(bg, Math.round(bgX), Math.round(bgY), Math.ceil(bgW), Math.ceil(bgH));
    const breath = Math.round(Math.sin(idleTime * 1.65) * 1.5), sway = Math.round(Math.sin(idleTime * .73) * 1.5);
    const actorSize = bgH * .70, baseX = w / 2 - actorSize / 2 + sway, baseY = bgY + bgH * .105 + breath;
    const sip = game.loser === 'ai' ? { x: w / 2, y: baseY + actorSize * .3 } : { x: w / 2 + 55, y: h * .82 };
    const pose = game.phase === 'drinking' && shotPos ? drinkPose(progress, game.loser === 'ai' ? { x: w / 2 - 45, y: baseY + actorSize * .7 } : { x: w * .6, y: h + 70 }, { x: shotPos.x, y: shotPos.y }, sip) : undefined;
    const index = drinkFrame(progress);
    const aiDrinking = !!pose && game.loser === 'ai';
    const counting = progress < .58;
    const activeGesture = game.phase === 'clash' && game.aiMove;
    const actorUrl = aiDrinking ? drinkFrameAsset(index, true) : activeGesture ? gestureFrameAsset(counting ? 'rock' : game.aiMove!, true) : drinkFrameAsset(7, true);
    const reach = aiDrinking ? smooth(progress / .16) * (1 - smooth((progress - .94) / .06)) * (1 - pose!.proximity) : 0;
    const actorX = baseX + (shotPos ? (shotPos.x - (baseX + actorSize * .43)) * reach : 0);
    const actorY = baseY + (shotPos ? (shotPos.y - (baseY + actorSize * .85)) * reach : 0);
    const flinch = alcoholReveal && game.loser === 'ai' ? Math.sin(progress * Math.PI * 5) * (1 - progress) * 3 : 0;
    const slump = game.phase === 'gameOver' && game.victor === 'player' ? smooth(progress) * 9 : 0;
    const bounce = activeGesture && counting ? Math.round(Math.sin(progress / .58 * Math.PI * 6) * 3) : 0;
    // The entire torso, arm, wrist and held glass are ONE PNG frame.
    // Table occlusion masks the coat below the rear edge, while the painted arm remains in front.
    const fore = activeGesture ? [[.03,.48],[.25,.42],[.60,.46],[.61,.70],[.25,.84],[.03,.81]] : aiDrinking && (index === 4 || index === 5) ? [[.02,.45],[.18,.36],[.50,.10],[.60,.24],[.24,.68],[.08,.72]] : aiDrinking && index === 3 ? [[.01,.51],[.25,.48],[.61,.40],[.63,.57],[.22,.73],[.05,.69]] : !aiDrinking || index === 7 ? [[.04,.69],[.30,.70],[.51,.68],[.60,.73],[.56,.82],[.32,.85],[.06,.82]] : [[.04,.57],[.25,.63],[.44,.73],[.56,.76],[.56,.91],[.40,.94],[.20,.88],[.04,.76]];
    c.save(); c.beginPath(); c.rect(0, 0, w, bgY + bgH * .552);
    fore.forEach(([x, y], i) => { const px = actorX + x * actorSize, py = actorY + y * actorSize; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); });
    c.closePath(); c.clip(); c.filter = 'brightness(0.62)';
    sprite(actorUrl, actorX + flinch, actorY + slump + bounce, actorSize); c.restore();
    const frameContainsGlass = !!pose && frameHasGlass(index, aiDrinking);
    canvas.dataset.animationStage = pose?.stage ?? game.phase;
    shots.forEach((s, i) => {
      const p = positions[i], picked = !!pose && s.id === game.selected;
      if (canSelect && hover.current === s.id && !s.used) sprite(assets.selectedPanel, p.x - 23, p.y + 20, 46, 15);
      if (!picked || !frameContainsGlass) sprite(s.used || (picked && pose.emptied) ? assets.empty : assets.glass, p.x - 18, p.y - 15, 36);
      c.textAlign = 'center'; c.font = '8px monospace'; c.fillStyle = s.used ? '#b4a086' : '#edc994';
      c.fillText(s.used ? s.alcohol ? '−1' : 'H₂O' : `${s.id + 1}`.padStart(2, '0'), p.x, p.y + 27);
    });
    if (game.phase === 'clash' && game.playerMove) {
      const playerSize = Math.max(145, Math.min(245, h * .5));
      const enter = smooth(progress / .15), exit = smooth((progress - .88) / .12);
      const y = h + 10 - (playerSize + 10) * enter * (1 - exit) + (counting ? Math.sin(progress / .58 * Math.PI * 6) * 5 : 0);
      sprite(gestureFrameAsset(counting ? 'rock' : game.playerMove), w / 2 - playerSize * .75, y, playerSize);
    }
    if (pose && game.loser === 'player' && shotPos) {
      const playerSize = Math.max(145, Math.min(310, (h - shotPos.y) / .6));
      const pivot = playerGlassPivot[index];
      // Fixed aspect ratio, no rotations, no sleeves synthesized between endpoints.
      // The glass and fingers are baked into this same cel.
      sprite(drinkFrameAsset(index), pose.grip.x - pivot.x * playerSize, pose.grip.y - pivot.y * playerSize, playerSize);
    }
    if (selected && shotPos && ['reveal', 'gameOver'].includes(game.phase)) {
      const reveal = smooth(progress / .23), fade = 1 - smooth((progress - .82) / .18);
      const x = shotPos.x + (w / 2 - shotPos.x) * reveal, y = shotPos.y + (h * .64 - shotPos.y) * reveal;
      const radius = 16 + progress * 53;
      c.save(); c.globalAlpha = fade;
      sprite(assets.selectedPanel, x - 78 * reveal, y - 30 * reveal, 156 * reveal, 83 * reveal);
      for (let i = 0; i < 10; i++) {
        const angle = i / 10 * Math.PI * 2; c.globalAlpha = fade * (1 - progress) * .8;
        c.fillStyle = selected.alcohol ? '#e49c46' : '#91c8d9';
        c.fillRect(Math.round(x + Math.cos(angle) * radius), Math.round(y + Math.sin(angle) * radius * .55), 2, selected.alcohol ? 2 : 4);
      }
      c.globalAlpha = fade; const glassSize = 36 + reveal * 16;
      sprite(assets.empty, x - glassSize / 2, y - glassSize / 2 - 5, glassSize);
      c.globalAlpha = fade * reveal; sprite(selected.alcohol ? assets.alcohol : assets.water, x - glassSize / 2, y - glassSize / 2 - 5, glassSize);
      c.textAlign = 'center'; c.fillStyle = selected.alcohol ? '#ffcc82' : '#b9deea'; c.font = 'bold 11px monospace';
      if (reveal > .5) { c.fillText(selected.alcohol ? 'АЛКОГОЛЬ' : 'ВОДА', x, y + 32); c.font = '8px monospace'; c.fillText(selected.alcohol ? '−1 ТРЕЗВОСТЬ' : 'БЕЗ ПОТЕРЬ', x, y + 45); }
      c.restore();
      if (selected.alcohol && game.loser === 'player' && progress < .4) { c.globalAlpha = .1 * (1 - progress / .4); c.fillStyle = '#9b3424'; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
    }
    if (game.phase === 'roundEnd') { c.globalAlpha = Math.min(.95, progress * 2); c.fillStyle = '#050508'; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
    c.restore(); frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
}
