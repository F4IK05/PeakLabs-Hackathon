'use client';
import { create } from 'zustand';
import { initial, start, transition, type Game, type Action } from './GameEngine';
import { normalize, type Settings } from './GameSettings';
interface Store { game: Game; setSettings: (s: Partial<Settings>) => void; start: () => void; menu: () => void; dispatch: (a: Action) => void }
export const useGameStore = create<Store>((set) => ({ game: initial(), setSettings: (s) => set(({ game }) => ({ game: { ...game, settings: normalize({ ...game.settings, ...s }) } })), start: () => set(({ game }) => ({ game: start(game.settings) })), menu: () => set(({ game }) => ({ game: initial(game.settings) })), dispatch: (a) => set(({ game }) => ({ game: transition(game, a) })) }));
