/** True when the text has letters but none are Latin, e.g. Hindi script for English speech. */
export function isNonLatin(text: string): boolean {
  return /\p{L}/u.test(text) && !/[A-Za-z]/.test(text)
}
