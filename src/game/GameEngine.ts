import { defaults, normalize, type Settings } from './GameSettings';
import { moves, winner, type Move } from './RockPaperScissors';
import { generateShots, type Shot } from './ShotManager';
import { drink, recover } from './SobrietySystem';
import type { TranslationKey } from '@/i18n/translations';
export type Phase = 'menu' | 'choose' | 'clash' | 'select' | 'drinking' | 'reveal' | 'roundEnd' | 'gameOver';
export interface Game { settings: Settings; phase: Phase; round: number; player: number; ai: number; shots: Shot[]; playerMove?: Move; aiMove?: Move; loser?: 'player' | 'ai'; selected?: number; victor?: 'player' | 'ai'; message: TranslationKey; history: TranslationKey[] }
export function initial(settings = defaults): Game { return { settings: normalize(settings), phase: 'menu', round: 1, player: settings.maxSobriety, ai: settings.maxSobriety, shots: [], message: 'welcome', history: [] }; }
export function start(settings: Settings): Game { const s = normalize(settings); return { ...initial(s), phase: 'choose', shots: generateShots(s.shotCount, s.alcoholCount), message: 'choose', history: ['newGame'] }; }
export type Action = { type: 'move'; move: Move; aiMove?: Move } | { type: 'shot'; id: number } | { type: 'advance' };
const log = (g: Game, message: TranslationKey): Game => ({ ...g, message, history: [message, ...g.history].slice(0, 8) });
export function transition(g: Game, a: Action): Game {
  if (a.type === 'move' && g.phase === 'choose') {
    const aiMove = a.aiMove ?? moves[Math.floor(Math.random() * 3)];
    const result = winner(a.move, aiMove);
    return { ...g, phase: 'clash', playerMove: a.move, aiMove, loser: result === 'draw' ? undefined : result === 'player' ? 'ai' : 'player', selected: undefined };
  }
  if (a.type === 'shot' && g.phase === 'select' && g.shots.some(s => s.id === a.id && !s.used)) return { ...g, selected: a.id, phase: 'drinking', message: 'drinking' };
  if (a.type !== 'advance') return g;
  if (g.phase === 'clash') return log({ ...g, phase: g.loser ? 'select' : 'choose' }, !g.loser ? 'draw' : g.loser === 'player' ? 'playerSelect' : 'aiSelect');
  if (g.phase === 'drinking') {
    const shot = g.shots.find(s => s.id === g.selected && !s.used);
    if (!shot || !g.loser) return g;
    const player = g.loser === 'player' ? drink(g.player, shot.alcohol) : g.player;
    const ai = g.loser === 'ai' ? drink(g.ai, shot.alcohol) : g.ai;
    const victor = player === 0 ? 'ai' : ai === 0 ? 'player' : undefined;
    return log({ ...g, player, ai, victor, phase: victor ? 'gameOver' : 'reveal', shots: g.shots.map(s => s.id === shot.id ? { ...s, used: true } : s) }, g.loser === 'player' ? shot.alcohol ? 'playerAlcohol' : 'playerWater' : shot.alcohol ? 'aiAlcohol' : 'aiWater');
  }
  if (g.phase === 'reveal') return g.shots.every(s => !s.alcohol || s.used) ? log({ ...g, phase: 'roundEnd' }, 'roundEnd') : { ...g, phase: 'choose', message: 'nextTurn' };
  if (g.phase === 'roundEnd') return { ...g, phase: 'choose', round: g.round + 1, player: recover(g.player, g.settings.recovery, g.settings.maxSobriety), ai: recover(g.ai, g.settings.recovery, g.settings.maxSobriety), shots: generateShots(g.settings.shotCount, g.settings.alcoholCount), selected: undefined, playerMove: undefined, aiMove: undefined, message: 'newRound' };
  return g;
}
