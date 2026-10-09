'use client';
import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { useGameStore } from '@/game/GameStore';
import { randomShot } from '@/game/ShotManager';
import { defaults, type Settings } from '@/game/GameSettings';
import { assets, handAsset } from '@/art/assets';
import GameCanvas from './GameCanvas';
import { phaseDuration } from '@/art/animation';

const labels = { rock: 'Камень', scissors: 'Ножницы', paper: 'Бумага' };
let audio: AudioContext | undefined;
function tone(frequency: number, enabled: boolean) {
  if (!enabled) return;
  try {
    audio ??= new AudioContext(); void audio.resume(); const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.04, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .13);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .13);
  } catch { /* Sound is optional. */ }
}
function SpriteButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return <button {...props} className={`sprite-button ${className}`}><img src={assets.panel} alt="" className="button-art"/><img src={assets.selectedPanel} alt="" className="button-art active-art"/><span className="button-content">{children}</span></button>;
}
export default function GameUI() {
  const { game: g, setSettings, start, menu, dispatch } = useGameStore();
  const [ready, setReady] = useState(false);
  const [spritesReady, setSpritesReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  useEffect(() => {
    try { const saved = localStorage.getItem('shot-roulette-settings'); if (saved) setSettings(JSON.parse(saved)); } catch {}
    setReady(true);
  }, [setSettings]);
  useEffect(() => { if (ready) { try { localStorage.setItem('shot-roulette-settings', JSON.stringify(g.settings)); } catch {} } }, [g.settings, ready]);
  useEffect(() => {
    const duration = g.phase === 'select' && g.loser === 'ai' ? 1100 : g.phase === 'gameOver' ? undefined : phaseDuration[g.phase];
    if (!duration) return;
    const timer = setTimeout(() => {
      if (g.phase === 'select') dispatch({ type: 'shot', id: randomShot(g.shots.filter(s => !s.used).map(s => s.id)) });
      else dispatch({ type: 'advance' });
      tone(g.phase === 'drinking' ? 180 : 330, useGameStore.getState().game.settings.sound);
    }, duration / g.settings.speed);
    return () => clearTimeout(timer);
  }, [g.phase, g.selected, g.round, g.settings.speed, dispatch]);
  useEffect(() => {
    setShowFinish(false);
    if (g.phase !== 'gameOver') return;
    const timer = setTimeout(() => setShowFinish(true), phaseDuration.gameOver! / g.settings.speed);
    return () => clearTimeout(timer);
  }, [g.phase, g.settings.speed]);
  const begin = () => { tone(440, g.settings.sound); setSettingsOpen(false); start(); };
  const setting = (key: keyof Settings, value: number | boolean) => setSettings({ [key]: value });
  const fullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); };
  return <main className="game-screen">
    <GameCanvas game={g} onReady={setSpritesReady} onShot={id => { tone(240, g.settings.sound); dispatch({ type: 'shot', id }); }}/>
    {g.phase === 'menu' ? <div className="menu-layer">
      <section className={`launch-menu ${settingsOpen ? 'with-settings' : ''}`} aria-label="Главное меню">
        <p className="overline">ПОСЛЕ ПОЛУНОЧИ · СТОЛ № 04</p>
        <h1>SHOT<br/><span>ROULETTE</span></h1>
        <p className="menu-tagline">Лица не видно. Шот уже на столе.</p>
        {!settingsOpen ? <div className="menu-buttons">
          <SpriteButton disabled={!ready || !spritesReady} onClick={begin}>СЕСТЬ ЗА СТОЛ</SpriteButton>
          <SpriteButton onClick={() => setSettingsOpen(true)}>Настройки</SpriteButton>
          <p className="rule-hint">Камень, ножницы, бумага.<br/>Проигравший пьёт. Останься на ногах.</p>
        </div> : <section className="settings-menu" aria-label="Настройки игры">
          <h2>Правила этого бара</h2>
          {([{ key: 'maxSobriety', title: 'Очки трезвости', min: 1, max: 12 }, { key: 'shotCount', title: 'Шотов на столе', min: 1, max: 12 }, { key: 'alcoholCount', title: 'Из них алкоголь', min: 1, max: g.settings.shotCount }, { key: 'recovery', title: 'Восстановление за раунд', min: 0, max: 12 }] as const).map(s => <div className="setting-row" key={s.key}><span>{s.title}</span><div className="stepper"><SpriteButton aria-label={`Уменьшить: ${s.title}`} disabled={g.settings[s.key] <= s.min} onClick={() => setting(s.key, g.settings[s.key] - 1)}>−</SpriteButton><output>{g.settings[s.key]}</output><SpriteButton aria-label={`Увеличить: ${s.title}`} disabled={g.settings[s.key] >= s.max} onClick={() => setting(s.key, g.settings[s.key] + 1)}>+</SpriteButton></div></div>)}
          <label className="setting-row"><span>Скорость анимаций</span><select value={g.settings.speed} onChange={e => setting('speed', Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
          {g.settings.recovery >= g.settings.alcoholCount && g.settings.maxSobriety > g.settings.alcoholCount && <p className="settings-warning">Восстановление может сделать партию бесконечной.</p>}
          <SpriteButton disabled={!ready || !spritesReady} onClick={begin}>СЕСТЬ ЗА СТОЛ</SpriteButton>
          <div className="settings-links"><button onClick={() => setSettings(defaults)}>Сбросить настройки</button><button onClick={() => setSettingsOpen(false)}>Назад</button></div>
        </section>}
        <span className="menu-footnote">ВИРТУАЛЬНЫЕ ШОТЫ · БЕЗ РЕГИСТРАЦИИ</span>
      </section>
    </div> : <>
      <header className="hud">
        {(['player', 'ai'] as const).map(who => <section key={who} className={`sobriety ${who}`} aria-label={`Трезвость ${who === 'player' ? 'игрока' : 'оппонента'}: ${g[who]} из ${g.settings.maxSobriety}`}><div><span>{who === 'player' ? 'ТЫ' : 'НЕЗНАКОМЕЦ'}</span><b>{g[who]}<small> / {g.settings.maxSobriety}</small></b></div><div className="sobriety-tokens">{Array.from({ length: g.settings.maxSobriety }, (_, i) => <img key={i} src={i < g[who] ? assets.token : assets.depleted} alt=""/>)}</div></section>)}
        <div className="round-counter">РАУНД <b>{String(g.round).padStart(2, '0')}</b></div>
      </header>
      <div className="game-toolbar"><SpriteButton onClick={menu}>В меню</SpriteButton><SpriteButton onClick={begin}>Заново</SpriteButton></div>
      <section className={`turn-controls ${['drinking', 'reveal', 'gameOver'].includes(g.phase) ? 'watch-animation' : ''}`}>
        <p className="turn-message" role="status" aria-live="polite">{g.message}</p>
        <div className="choices">{(['rock', 'scissors', 'paper'] as const).map((move, i) => <SpriteButton key={move} disabled={g.phase !== 'choose'} onClick={() => { tone(520, g.settings.sound); dispatch({ type: 'move', move }); }} aria-label={`0${i + 1} ${labels[move]}`}><img src={handAsset(move)} alt=""/><span>{labels[move]}</span></SpriteButton>)}</div>
        <p className="table-count">{g.shots.filter(s => !s.used && s.alcohol).length} алкоголь · {g.shots.filter(s => !s.used && !s.alcohol).length} вода{g.playerMove && <span> · Ты: {labels[g.playerMove]} / CPU: {labels[g.aiMove!]}</span>}</p>
      </section>
    </>}
    <div className="utility-controls"><SpriteButton onClick={() => setting('sound', !g.settings.sound)} aria-label={g.settings.sound ? 'Выключить звук' : 'Включить звук'}>Звук {g.settings.sound ? 'вкл' : 'выкл'}</SpriteButton><SpriteButton onClick={fullscreen} aria-label="На весь экран">⛶</SpriteButton></div>
    {g.phase === 'gameOver' && showFinish && <div className="finish-layer"><section className="finish-menu"><p className="overline">ПОСЛЕДНИЙ ШОТ ВЫПИТ</p><h2>{g.victor === 'player' ? 'Ты ещё на ногах.' : 'На сегодня хватит.'}</h2><p>{g.victor === 'player' ? 'Незнакомец больше не держится.' : 'Эта ночь осталась за незнакомцем.'}</p><p className="final-score">ТЫ {g.player} : {g.ai} CPU</p><SpriteButton onClick={begin}>ЕЩЁ ОДНА ПАРТИЯ</SpriteButton><SpriteButton onClick={menu}>Вернуться в меню</SpriteButton></section></div>}
  </main>;
}
