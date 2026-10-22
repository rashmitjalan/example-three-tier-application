const { test } = require('node:test');
const assert = require('node:assert');
const { slugify } = require('./slugify');

test('lowercases and joins words with hyphens', () => {
  assert.strictEqual(slugify('Hello World'), 'hello-world');
});

test('trims surrounding whitespace', () => {
  assert.strictEqual(slugify('   Hello   World  '), 'hello-world');
});

test('collapses runs of punctuation into a single hyphen', () => {
  assert.strictEqual(slugify('Hello, World! -- Again?'), 'hello-world-again');
});

test('removes leading and trailing hyphens', () => {
  assert.strictEqual(slugify('--Hello World!!!'), 'hello-world');
  assert.strictEqual(slugify('***'), '');
});

test('keeps digits', () => {
  assert.strictEqual(slugify('Top 10 Tips (2024)'), 'top-10-tips-2024');
});

test('returns an empty string for empty or whitespace-only input', () => {
  assert.strictEqual(slugify(''), '');
  assert.strictEqual(slugify('   '), '');
});
