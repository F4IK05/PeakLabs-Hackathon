import playerBounds from './playerBounds.json';
import type { Game } from '@/game/GameEngine';
import { assets, drinkFrameAsset, gestureFrameAsset, sceneShots, paintedFrame, opponentLayout } from './assets';
import { clamp, drinkPose, drinkFrame, frameHasGlass, playerGlassPivot, phaseDuration, smooth, opponentHand } from './animation';

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
    const crop = playerBounds[url as keyof typeof playerBounds];
    if (crop && images[crop.url]) {
      c.drawImage(images[crop.url], Math.round(x+crop.left/256*width), Math.round(y+crop.top/256*height), Math.round(crop.width/256*width), Math.round(crop.height/256*height));
      return;
    }
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
    const layout = opponentLayout(w,h);
    const actorSize=layout.size, baseX=layout.x, baseY=layout.y;
    const sip = game.loser === 'ai' ? { x: w/2, y:baseY+actorSize*.36 } : {x:w/2+55,y:h*.82};
    const pose=game.phase==='drinking'&&shotPos?drinkPose(progress,game.loser==='ai'?{x:w/2-35,y:layout.tableEdge}:{x:w*.6,y:h+70},shotPos,sip):undefined;
    const index=drinkFrame(progress), aiDrinking=!!pose&&game.loser==='ai';
    const counting=progress<.58;
    const mirrored=!!(aiDrinking&&shotPos&&opponentHand(shotPos.x,w/2)==='screen-right');
    canvas.dataset.opponentHand=mirrored?'screen-right':'screen-left';
    canvas.dataset.opponentX=String(w/2);
    canvas.dataset.opponentFrame=String(aiDrinking?index:0);
    c.save();c.globalAlpha=.55;
    sprite(assets.rigShadow,w/2-actorSize*.56,layout.tableEdge-2,actorSize*1.12,actorSize*.28);c.restore();
    let opponentURL=paintedFrame('gesture',0),flip=false;
    if(aiDrinking&&shotPos) {
      const lane=(shotPos.x-layout.x)/actorSize;
      const outer=lane<.23||lane>.77,center=Math.abs(lane-.53)<.07;
      if(center) canvas.dataset.opponentHand='screen-left';
      const sequence=outer?'outer':center?'center':'inner';
      flip=mirrored&&!center;
      opponentURL=paintedFrame(sequence,index);
      // Authored whole poses connect the arm to the coat. No limb scaling or rotation.
      if(index===2 && !outer) {
        const cel=center?3:2;
        opponentURL=paintedFrame('poses',cel);
      }
    } else if(game.phase==='clash'&&game.aiMove) {
      const beat=Math.floor(progress/.58*6)%2;
      const cel=progress<.12||progress>.94?0:counting?(beat?5:4):(['rock','scissors','paper'] as const).indexOf(game.aiMove)+1;
      opponentURL=paintedFrame('gesture',cel);
    }
    const drawOpponent=()=>{
      c.save();c.filter='brightness(0.66)';
      const breathing=game.phase==='choose'||game.phase==='menu'?Math.round(Math.sin(idleTime*1.1)):0;
      if(flip){c.translate(w,0);c.scale(-1,1);}
      // The table occludes the torso; only the painted active forearm is in front.
      const armWidth=aiDrinking ? (index===4||index===5 ? .31 : index===3 ? .34 : .64) : .56;
      c.beginPath();c.rect(0,0,w,layout.tableEdge);
      c.rect(baseX,layout.tableEdge,actorSize*armWidth,h-layout.tableEdge);c.clip();
      sprite(opponentURL,baseX,baseY+breathing,actorSize);c.restore();
    };
    const frameContainsGlass = !!pose && frameHasGlass(index, aiDrinking);
    canvas.dataset.animationStage = pose?.stage ?? game.phase;
    drawOpponent();
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
      const y = h + 32 - playerSize * enter * (1 - exit) + (counting ? Math.sin(progress / .58 * Math.PI * 6) * 5 : 0);
      sprite(gestureFrameAsset(counting ? 'rock' : game.playerMove), w / 2 + playerSize * .02, y, playerSize);
    }
    if (pose && game.loser === 'player' && shotPos) {
      // Keep the painted sleeve's bottom cut beyond the viewport in every cel,
      // including low shots on portrait screens. Size stays fixed during the sip.
      const playerSize = Math.max(145, (h - shotPos.y + 32) / .52);
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



