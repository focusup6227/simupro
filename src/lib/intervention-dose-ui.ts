/**
 * Legacy intervention sub-option labels that should be free-typed (no preset dose list in UI).
 * Only a narrow set of equipment-level choices stay as selects; everything else is typed so
 * the learner must recall the correct dose/route rather than picking from a menu.
 */
export function isTypedDoseSubOptionLabel(label: string): boolean {
  const t = label.trim();
  // Equipment choices where a dropdown is clinically appropriate:
  if (/energy\s*\(joules?\)/i.test(t)) return false;
  if (/tube size/i.test(t)) return false;
  if (/^rate \(ppm\)/i.test(t)) return false; // transcutaneous pacing rate
  // Everything else → free-text input (dose, route, volume, method, delivery, etc.)
  return true;
}
