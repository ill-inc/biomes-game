import words from "@/shared/util/profanity.json";

let _f: RegExp | undefined = undefined;
function getRegexp() {
  if (_f) {
    return _f;
  }

  const escapeRegexp = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const allWords = words["words"];
  const escaped = allWords.map((e) => escapeRegexp(e));

  _f = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return _f;
}

export function containsProfanity(text: string): boolean {
  return getRegexp().test(text);
}

export function filterProfanity(text: string): string {
  return text.replaceAll(getRegexp(), "%@$$&*");
}
