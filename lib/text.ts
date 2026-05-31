// Small deterministic post-processors for AI output. These enforce the hard
// voice rules that models ignore when they're buried in a long master doc.

const NEUTRAL_TERM = 'friend';

/**
 * Apply the hard, deterministic voice rules to a generated reply:
 *  - Em/en dashes: a spaced dash (" — ") becomes a sentence break ("."), an
 *    inline one ("word—word") a hyphen. No commas are introduced (we avoid them).
 *  - Gendered slang ("bro" / "bruh") → a gender-neutral term.
 *  - Capitalize the first letter of the message.
 * Comma-avoidance and the other softer rules live in the master doc.
 */
export function sanitizeReply(s: string): string {
  let out = s
    .replace(/\s*[—–]\s*/g, (m) => (/\s/.test(m) ? '. ' : '-'))
    .replace(/\bbro\b/gi, NEUTRAL_TERM)
    .replace(/\bbruh\b/gi, NEUTRAL_TERM)
    .replace(/\.\s*\.\s*/g, '. ')
    .trim();
  // Capitalize the first alphabetic character (skipping leading emoji/quotes).
  const i = out.search(/[A-Za-z]/);
  if (i >= 0 && out[i] >= 'a' && out[i] <= 'z') {
    out = out.slice(0, i) + out[i].toUpperCase() + out.slice(i + 1);
  }
  return out;
}
