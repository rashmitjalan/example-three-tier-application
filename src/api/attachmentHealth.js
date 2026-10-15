// Deterministic health response: always returns the same value and requires no database.
function attachmentHealth() {
  return { ok: true, marker: 'maple-lantern-73' };
}

module.exports = attachmentHealth;
