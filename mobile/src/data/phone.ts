/** US and Canada numbers in E.164, or null when the input is not a 10-digit NANP number. */
export function normalizeUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return null;
  if (national[0] < '2' || national[3] < '2') return null;
  return `+1${national}`;
}

/** (415) 555-0134. Returns the original text when it is not E.164. */
export function formatUsPhone(value: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(value);
  if (!match) return value;
  return `(${match[1]}) ${match[2]}-${match[3]}`;
}

export function phoneLast4(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  return digits.slice(-4);
}
