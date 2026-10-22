'use strict';

/**
 * Convert text to a URL-friendly slug.
 *
 * Lowercases, trims whitespace, replaces each run of non-alphanumeric
 * characters with a single hyphen, and removes leading/trailing hyphens.
 *
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
