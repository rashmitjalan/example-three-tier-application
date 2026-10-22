'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { slugify } = require('./slugify');

test('slugifies normal text', () => {
  assert.strictEqual(slugify('Hello World'), 'hello-world');
  assert.strictEqual(slugify('  Spaces   around  '), 'spaces-around');
  assert.strictEqual(slugify('Already-slugged-123'), 'already-slugged-123');
});

test('collapses punctuation and trims hyphens', () => {
  assert.strictEqual(slugify('Hello, World!'), 'hello-world');
  assert.strictEqual(slugify('--Foo__Bar..Baz--'), 'foo-bar-baz');
  assert.strictEqual(slugify('!!!wow???'), 'wow');
  assert.strictEqual(slugify('***'), '');
});

test('returns an empty string for empty input', () => {
  assert.strictEqual(slugify(''), '');
  assert.strictEqual(slugify('   '), '');
});
