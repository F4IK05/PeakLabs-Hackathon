export const moves = ['rock', 'scissors', 'paper'] as const;
export type Move = typeof moves[number];
export function winner(player: Move, ai: Move): 'player' | 'ai' | 'draw' {
  if (player === ai) return 'draw';
  return ({ rock: 'scissors', scissors: 'paper', paper: 'rock' }[player] === ai) ? 'player' : 'ai';
}
