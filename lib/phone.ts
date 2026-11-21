// US numbers can be typed any way ("617-555-1234"); other countries need "+",
// e.g. +82 10 1234 5678. Korean mobiles typed as 010-1234-5678 also work.
// Saved as +16175551234 / +821012345678.
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (input.trim().startsWith("+")) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  if (/^01[016789]\d{7,8}$/.test(digits)) return `+82${digits.slice(1)}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
