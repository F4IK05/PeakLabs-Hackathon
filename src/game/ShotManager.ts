export interface Shot { id: number; alcohol: boolean; used: boolean }
export function generateShots(total: number, alcohol: number, random = Math.random): Shot[] {
  const contents = Array.from({ length: total }, (_, i) => i < alcohol);
  for (let i = total - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [contents[i], contents[j]] = [contents[j], contents[i]]; }
  return contents.map((alcohol, id) => ({ id, alcohol, used: false }));
}
// Strategy receives only available IDs: hidden contents never reach the AI.
export function randomShot(ids: number[], random = Math.random) { return ids[Math.floor(random() * ids.length)]; }
