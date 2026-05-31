// Small text post-processors for AI output.

/**
 * Remove em/en dashes from generated text. Models reach for "—" constantly and a
 * soft "no em dashes" instruction in a long master doc isn't reliable, so we
 * enforce it deterministically: a spaced dash (" — ") becomes a comma, an inline
 * one ("word—word") a hyphen. Collapses any doubled commas the swap creates.
 */
export function stripEmDashes(s: string): string {
  return s
    .replace(/ *[—–] */g, (m) => (/ /.test(m) ? ', ' : '-'))
    .replace(/,\s*,/g, ',');
}
