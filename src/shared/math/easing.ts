// Reference: https://gist.github.com/Fonserbc/3d31a25e87fdaa541ddf

function square(t: number) {
  return t * t;
}

function flip(t: number) {
  return 1 - t;
}

function lerp(a: number, b: number, t: number) {
  return a + t * (b - a);
}

export function easeIn(t: number) {
  return square(t);
}

export function easeOut(t: number) {
  return flip(easeIn(flip(t)));
}

export function easeInOut(t: number) {
  return lerp(easeIn(t), easeOut(t), t);
}

export function easeInOutMore(t: number) {
  return easeInOut(easeInOut(t));
}
