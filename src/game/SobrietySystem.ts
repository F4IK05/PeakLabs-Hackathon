export const drink = (value: number, alcohol: boolean) => Math.max(0, value - Number(alcohol));
export const recover = (value: number, amount: number, max: number) => Math.min(max, value + amount);
