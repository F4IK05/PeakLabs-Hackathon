'use client';
import { useEffect, useRef, useState } from 'react';
import type { Game } from '@/game/GameEngine';
import { assets, handAsset, sceneShots, actorAssets } from '@/art/assets';
import { renderScene } from '@/art/renderScene';
import { dictionaries, type Locale } from '@/i18n/translations';

export default function GameCanvas({ game, locale, onShot, onReady }: { game: Game; locale: Locale; onShot: (id: number) => void; onReady?: (ready: boolean) => void }) {
  const t = dictionaries[locale];
  const ref = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const hover = useRef<number | undefined>(undefined);
  const phaseClock = useRef({ key: '', start: 0 });
  const [size, setSize] = useState({ width: 480, height: 270 });
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [error, setError] = useState(false);
  const canSelect = game.phase === 'select' && game.loser === 'player';
  const preview = game.phase === 'menu';
  const shots = preview ? Array.from({ length: 5 }, (_, id) => ({ id, used: false, alcohol: false })) : game.shots;
  const positions = sceneShots(shots.length, size.width, size.height);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const aspect = entry.contentRect.width / Math.max(1, entry.contentRect.height);
      setSize(aspect >= 16 / 9 ? { width: Math.round(270 * aspect), height: 270 } : { width: 480, height: Math.round(480 / aspect) });
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    const sceneAssets=Object.entries(assets).filter(([name])=>!name.startsWith('rig')||name==='rigShadow').map(([,url])=>url);
    const urls = [...sceneAssets, ...actorAssets, ...(['rock', 'scissors', 'paper', 'reach'] as const).map(move => handAsset(move))];
    Promise.all(urls.map(url => new Promise<[string, HTMLImageElement]>((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve([url, image]); image.onerror = reject; image.src = url;
    }))).then(entries => { if (active) { setImages(Object.fromEntries(entries)); onReady?.(true); } }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [onReady]);
  useEffect(() => {
    if (!ref.current) return;
    return renderScene(ref.current, game, size, images, hover, phaseClock, locale);
  }, [game, size, images, locale]);

  return <div className="world" ref={container} data-phase={game.phase}>
    <canvas ref={ref} width={size.width} height={size.height} aria-label={t.scene} role="img"/>
    {!images[assets.background] && <div className="asset-loading" role="status">{error ? t.loadError : t.loading}</div>}
    {!preview && shots.map((s, i) => <button key={s.id} className="shot-target" style={{ left: `${(positions[i].x - 15) / size.width * 100}%`, top: `${(positions[i].y - 23) / size.height * 100}%`, width: `${30 / size.width * 100}%`, height: `${51 / size.height * 100}%` }} disabled={!canSelect || s.used} onPointerEnter={() => { hover.current = s.id; }} onPointerLeave={() => { hover.current = undefined; }} onFocus={() => { hover.current = s.id; }} onBlur={() => { hover.current = undefined; }} onClick={() => onShot(s.id)} aria-label={`${t.shot} ${s.id + 1}, ${s.used ? s.alcohol ? t.drunkAlcohol : t.drunkWater : t.closed}`}/>)}
  </div>;
}
