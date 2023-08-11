export function secondsSinceEpoch() {
  return Date.now() / 1000;
}

export function secondsSinceEpochToDate(secondsSince: number) {
  return new Date(secondsSince * 1000);
}
