/**
 * Legacy intervention sub-option labels that should be free-typed (no preset dose list in UI).
 * Equipment / energy menus stay as selects.
 */
export function isTypedDoseSubOptionLabel(label: string): boolean {
  const t = label.trim();
  if (/energy\s*\(joules?\)/i.test(t)) return false;
  if (/tube size/i.test(t)) return false;
  if (/^rate \(ppm\)/i.test(t)) return false;
  if (/^method$/i.test(t)) return false;
  if (/^delivery$/i.test(t)) return false;
  return /dosage|dose|volume|infusion|concentration|mEq|dextrose|glucose/i.test(t);
}
