export function timeStamp(label: string) {
  if ("timeStamp" in console) {
    console.timeStamp(label);
  }
}
