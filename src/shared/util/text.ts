import { last, take } from "lodash";

export function commaList(stuff: string[], final: "and" | "or") {
  if (stuff.length === 0) {
    return "";
  } else if (stuff.length === 1) {
    return stuff[0];
  } else {
    return `${take(stuff, stuff.length - 1).join(", ")} ${final} ${last(
      stuff
    )}`;
  }
}

export function andify(stuff: string[]) {
  return commaList(stuff, "and");
}

export function orify(stuff: string[]) {
  return commaList(stuff, "or");
}

export function removeVowels(stuff: string) {
  return stuff.replace(/[aeiou]/gi, "");
}

// Indefinite article for a word.
export function article(stuff: string) {
  return stuff.match(/^[aeiou]/i) ? "an" : "a";
}

export function capitalize<T extends string>(stuff: T) {
  return (stuff[0].toUpperCase() + stuff.slice(1)) as Capitalize<T>;
}
