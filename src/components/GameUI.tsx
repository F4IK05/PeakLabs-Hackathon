'use client';
import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { useGameStore } from '@/game/GameStore';
import { randomShot } from '@/game/ShotManager';
import { defaults, type Settings } from '@/game/GameSettings';
import { assets, handAsset } from '@/art/assets';
import GameCanvas from './GameCanvas';
import { phaseDuration } from '@/art/animation';
import { dictionaries, isLocale, languageNames, type Locale } from '@/i18n/translations';

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
  const [locale, setLocale] = useState<Locale>('en');
  const t = dictionaries[locale];
  const labels = { rock: t.rock, scissors: t.scissors, paper: t.paper };
  useEffect(() => {
    try { const saved = localStorage.getItem('shot-roulette-settings'); if (saved) setSettings(JSON.parse(saved)); } catch {}
    try { const saved = localStorage.getItem('shot-roulette-language'); if (isLocale(saved)) setLocale(saved); } catch {}
    setReady(true);
  }, [setSettings]);
  useEffect(() => {
    document.documentElement.lang = locale;
    if (ready) { try { localStorage.setItem('shot-roulette-language', locale); } catch {} }
  }, [locale, ready]);
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
  return <main className="game-screen" lang={locale}>
    <GameCanvas game={g} locale={locale} onReady={setSpritesReady} onShot={id => { tone(240, g.settings.sound); dispatch({ type: 'shot', id }); }}/>
    {g.phase === 'menu' ? <div className="menu-layer">
      <section className={`launch-menu ${settingsOpen ? 'with-settings' : ''}`} aria-label={t.mainMenu}>
        <p className="overline">{t.overline}</p>
        <h1>FRIDAY<br/><span>EVENING</span></h1>
        <p className="menu-tagline">{t.tagline}</p>
        {!settingsOpen ? <div className="menu-buttons">
          <SpriteButton disabled={!ready || !spritesReady} onClick={begin}>{t.sit}</SpriteButton>
          <SpriteButton onClick={() => setSettingsOpen(true)}>{t.settings}</SpriteButton>
          <p className="rule-hint">{t.rules}<br/>{t.ruleHint}</p>
        </div> : <section className="settings-menu" aria-label={t.gameSettings}>
          <h2>{t.barRules}</h2>
          <label className="setting-row language-control"><span>{t.language}</span><select aria-label={t.language} value={locale} onChange={e => { if (isLocale(e.target.value)) setLocale(e.target.value); }}>{(['en', 'az', 'ru'] as const).map(language => <option key={language} value={language} lang={language}>{languageNames[language]}</option>)}</select></label>
          {([{ key: 'maxSobriety', min: 1, max: 12 }, { key: 'shotCount', min: 1, max: 12 }, { key: 'alcoholCount', min: 1, max: g.settings.shotCount }, { key: 'recovery', min: 0, max: 12 }] as const).map(s => <div className="setting-row" key={s.key}><span>{t[s.key]}</span><div className="stepper"><SpriteButton aria-label={`${t.decrease}: ${t[s.key]}`} disabled={g.settings[s.key] <= s.min} onClick={() => setting(s.key, g.settings[s.key] - 1)}>−</SpriteButton><output>{g.settings[s.key]}</output><SpriteButton aria-label={`${t.increase}: ${t[s.key]}`} disabled={g.settings[s.key] >= s.max} onClick={() => setting(s.key, g.settings[s.key] + 1)}>+</SpriteButton></div></div>)}
          <label className="setting-row"><span>{t.speed}</span><select value={g.settings.speed} onChange={e => setting('speed', Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
          {g.settings.recovery >= g.settings.alcoholCount && g.settings.maxSobriety > g.settings.alcoholCount && <p className="settings-warning">{t.warning}</p>}
          <SpriteButton disabled={!ready || !spritesReady} onClick={begin}>{t.sit}</SpriteButton>
          <div className="settings-links"><button onClick={() => setSettings(defaults)}>{t.reset}</button><button onClick={() => setSettingsOpen(false)}>{t.back}</button></div>
        </section>}
        <span className="menu-footnote">{t.footnote}</span>
      </section>
    </div> : <>
      <header className="hud">
        {(['player', 'ai'] as const).map(who => <section key={who} className={`sobriety ${who}`} aria-label={`${t.sobriety} ${who === 'player' ? t.player : t.opponent}: ${g[who]} ${t.of} ${g.settings.maxSobriety}`}><div><span>{who === 'player' ? t.you : t.stranger}</span><b>{g[who]}<small> / {g.settings.maxSobriety}</small></b></div><div className="sobriety-tokens">{Array.from({ length: g.settings.maxSobriety }, (_, i) => <img key={i} src={i < g[who] ? assets.token : assets.depleted} alt=""/>)}</div></section>)}
        <div className="round-counter">{t.round}<b>{String(g.round).padStart(2, '0')}</b></div>
      </header>
      <section className={`turn-controls ${['drinking', 'reveal', 'gameOver'].includes(g.phase) ? 'watch-animation' : ''}`}>
        <p className="turn-message" role="status" aria-live="polite">{t[g.message].replace('{recovery}', String(g.settings.recovery))}</p>
        <div className="choices">{(['rock', 'scissors', 'paper'] as const).map((move, i) => <SpriteButton key={move} disabled={g.phase !== 'choose'} onClick={() => { tone(520, g.settings.sound); dispatch({ type: 'move', move }); }} aria-label={`0${i + 1} ${labels[move]}`}><img src={handAsset(move)} alt=""/><span>{labels[move]}</span></SpriteButton>)}</div>
        <p className="table-count">{g.shots.filter(s => !s.used && s.alcohol).length} {t.alcohol} · {g.shots.filter(s => !s.used && !s.alcohol).length} {t.water}{g.playerMove && <span> · {t.you}: {labels[g.playerMove]} / CPU: {labels[g.aiMove!]}</span>}</p>
      </section>
    </>}
    <div className={`control-bar ${g.phase === 'menu' ? 'menu-controls' : ''}`}>
      {g.phase !== 'menu' && <div className="game-toolbar"><SpriteButton onClick={menu}>{t.menu}</SpriteButton><SpriteButton onClick={begin}>{t.restart}</SpriteButton></div>}
      <div className="utility-controls">
        <SpriteButton onClick={() => setting('sound', !g.settings.sound)} aria-label={g.settings.sound ? t.mute : t.unmute}>{t.sound} {g.settings.sound ? t.on : t.off}</SpriteButton><SpriteButton onClick={fullscreen} aria-label={t.fullscreen}>⛶</SpriteButton>
      </div>
    </div>
    {g.phase === 'gameOver' && showFinish && <div className="finish-layer"><section className="finish-menu"><p className="overline">{t.lastShot}</p><h2>{g.victor === 'player' ? t.winTitle : t.loseTitle}</h2><p>{g.victor === 'player' ? t.winText : t.loseText}</p><p className="final-score">{t.you} {g.player} : {g.ai} CPU</p><SpriteButton onClick={begin}>{t.again}</SpriteButton><SpriteButton onClick={menu}>{t.returnMenu}</SpriteButton></section></div>}
  </main>;
}
