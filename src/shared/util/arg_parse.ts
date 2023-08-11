export function restrictedStringArg<T extends readonly string[]>(
  val: string,
  valid: [...T]
): T[number] {
  if (valid.indexOf(val) < 0) {
    throw new Error(`Invalid argument ${valid}`);
  }
  return val as T[number];
}
