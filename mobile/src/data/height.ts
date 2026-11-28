/** Feet 4–7 and inches 0–11. The stored display form is 5'6". */

export function formatHeight(feet: string, inches: string): string {
  if (!feet.trim() && !inches.trim()) return '';
  const parsed = readPair(feet, inches);
  if (!parsed) return '';
  return `${parsed.feet}'${parsed.inches}"`;
}

export function readPair(feet: string, inches: string): { feet: number; inches: number } | null {
  if (!/^\d+$/.test(feet.trim()) || !/^\d+$/.test(inches.trim())) return null;
  const feetNumber = Number(feet);
  const inchesNumber = Number(inches);
  if (feetNumber < 4 || feetNumber > 7 || inchesNumber < 0 || inchesNumber > 11) return null;
  return { feet: feetNumber, inches: inchesNumber };
}

/** Turns a saved height such as 5'6" or 170 cm into separate feet and inches. */
export function splitHeight(value: string): { feet: string; inches: string } {
  const text = value.trim();
  if (!text) return { feet: '', inches: '' };
  const imperial = text.match(/^(\d)\s*(?:'|ft\.?|feet)?\s*(\d{1,2})\s*(?:"|in\.?|inches)?$/i);
  if (imperial) return { feet: imperial[1], inches: String(Number(imperial[2])) };
  const feetOnly = text.match(/^(\d)\s*(?:'|ft\.?|feet)$/i);
  if (feetOnly) return { feet: feetOnly[1], inches: '0' };
  const cm = text.match(/^(\d{2,3})(?:\.\d+)?\s*cm$/i);
  if (cm) {
    const total = Math.round(Number(cm[1]) / 2.54);
    const feet = Math.floor(total / 12);
    const inches = total % 12;
    if (feet >= 4 && feet <= 7 && inches >= 0 && inches <= 11) {
      return { feet: String(feet), inches: String(inches) };
    }
  }
  return { feet: '', inches: '' };
}

export function canonicalHeight(value: string): string {
  const parts = splitHeight(value);
  return formatHeight(parts.feet, parts.inches);
}
