import { expect, it } from 'vitest';
import { dictionaries, en, isLocale } from './translations';
import { defaults } from '../game/GameSettings';
import { start, transition } from '../game/GameEngine';

it('provides every English key in Azerbaijani and Russian', () => {
  for (const dictionary of Object.values(dictionaries)) {
    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(en).sort());
    for (const value of Object.values(dictionary)) expect(value.trim().length).toBeGreaterThan(0);
  }
  expect(isLocale('az')).toBe(true);
  expect(isLocale('en')).toBe(true);
  expect(isLocale('ru')).toBe(true);
  expect(isLocale('constructor')).toBe(false);
  expect(isLocale(null)).toBe(false);
});

it('keeps game messages translatable after a language change during a turn', () => {
  let game = start({ ...defaults, shotCount: 1, alcoholCount: 1 });
  game = transition(game, { type: 'move', move: 'rock', aiMove: 'paper' });
  game = transition(game, { type: 'advance' });
  expect(game.message).toBe('playerSelect');
  game = transition(game, { type: 'shot', id: 0 });
  expect(game.message).toBe('drinking');
  game = transition(game, { type: 'advance' });
  expect(game.message).toBe('playerAlcohol');
  for (const dictionary of Object.values(dictionaries)) {
    expect(dictionary[game.message]).toBeTruthy();
    for (const message of game.history) expect(dictionary[message]).toBeTruthy();
  }
});
