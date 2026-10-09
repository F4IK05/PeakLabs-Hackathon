export interface Settings { maxSobriety: number; shotCount: number; alcoholCount: number; recovery: number; speed: number; sound: boolean }
export const defaults: Settings = { maxSobriety: 6, shotCount: 5, alcoholCount: 2, recovery: 1, speed: 1, sound: true };
export function normalize(s: Partial<Settings>): Settings {
  const int = (v: unknown, fallback: number, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;
  const shotCount = int(s.shotCount, 5, 1, 12);
  return { maxSobriety: int(s.maxSobriety, 6, 1, 12), shotCount, alcoholCount: int(s.alcoholCount, 2, 1, shotCount), recovery: int(s.recovery, 1, 0, 12), speed: typeof s.speed === 'number' && [0.5, 1, 2].includes(s.speed) ? s.speed : 1, sound: typeof s.sound === 'boolean' ? s.sound : true };
}
