'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { slugify } = require('./slugify');

test('slugifies normal text', () => {
  assert.strictEqual(slugify('Hello World'), 'hello-world');
  assert.strictEqual(slugify('  Trim Me  '), 'trim-me');
  assert.strictEqual(slugify('Node 22 Rocks'), 'node-22-rocks');
});

test('replaces punctuation runs with a single hyphen', () => {
  assert.strictEqual(slugify('Hello, World!'), 'hello-world');
  assert.strictEqual(slugify('a --- b___c'), 'a-b-c');
  assert.strictEqual(slugify('!!!Hello???'), 'hello');
  assert.strictEqual(slugify('---'), '');
});

test('returns an empty string for empty input', () => {
  assert.strictEqual(slugify(''), '');
  assert.strictEqual(slugify('   '), '');
});
