export const secondsToMs = (n: number) => n * 1000;
export const minutesToMs = (n: number) => secondsToMs(60 * n);
export const hoursToMs = (n: number) => minutesToMs(60 * n);
export const daysToMs = (n: number) => hoursToMs(24 * n);
export const weeksToMs = (n: number) => daysToMs(7 * n);
