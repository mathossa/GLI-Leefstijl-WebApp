// Shared, dependency-free validation for display names in user management.
// Keep this aligned with the 120-character limit on the input field.
export function normalizeDisplayName(input) {
  if (typeof input !== "string") return null;
  const name = input.trim();
  if (!name || name.length > 120) return null;
  for (const character of name) {
    const point = character.codePointAt(0);
    if (point === undefined || point < 32 || point === 127) return null;
  }
  return name;
}
