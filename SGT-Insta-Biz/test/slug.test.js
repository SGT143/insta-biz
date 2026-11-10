// Unit tests for website-address rules (no emulator needed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as client from '../app/public/js/slug.js';

const require = createRequire(import.meta.url);
const server = require('../functions/lib/onboard.js');

test('slugify makes clean addresses', () => {
  assert.equal(server.slugify('Sharma Tours & Travels!'), 'sharma-tours-and-travels');
  assert.equal(server.slugify('  Shree   Ganesh  Yatra  '), 'shree-ganesh-yatra');
  assert.equal(server.slugify('Café Trips'), 'cafe-trips');
  assert.equal(server.slugify('---'), '');
  assert.ok(server.slugify('a'.repeat(60)).length <= 40);
});

test('valid addresses', () => {
  for (const s of ['abc', 'sharma-tours', 'goa2go', 'a1b', 'x'.repeat(40), 'himalayan-trails-manali-2']) {
    assert.equal(server.slugProblem(s), null, s);
  }
});

test('invalid addresses', () => {
  const bad = ['', 'ab', 'x'.repeat(41), '-abc', 'abc-', 'ab--cd', 'Abc', 'ab c', 'ab_c', 'ab.c', 'हिंदी'];
  for (const s of bad) assert.notEqual(server.slugProblem(s), null, JSON.stringify(s));
});

test('reserved words are rejected', () => {
  for (const s of ['admin', 'onboard', 'www', 'api', 'login', 'site', 'instabiz']) {
    assert.match(server.slugProblem(s), /reserved/, s);
    assert.equal(server.isValidSlug(s), false);
  }
});

test('candidates: name, then name-city, then numbered', () => {
  const c = server.slugCandidates('Himalayan Trails', 'Manali');
  assert.deepEqual(c.slice(0, 4), ['himalayan-trails', 'himalayan-trails-manali', 'himalayan-trails-manali-2', 'himalayan-trails-manali-3']);
  assert.equal(c.length, server.MAX_CANDIDATES);
  assert.ok(c.every(server.isValidSlug));
});

test('candidates skip reserved and too-short names', () => {
  assert.deepEqual(server.slugCandidates('Admin', 'Delhi').slice(0, 2), ['admin-delhi', 'admin-delhi-2']);
  assert.equal(server.slugCandidates('AB', 'Goa')[0], 'ab-goa');
});

test('candidates stay within 40 chars', () => {
  const c = server.slugCandidates('Very Long Business Name Tours And Travels', 'Thiruvananthapuram');
  assert.ok(c.length > 1);
  assert.ok(c.every((s) => s.length <= 40 && server.isValidSlug(s)), c.join(', '));
});

test('Indian mobile numbers normalise to +91', () => {
  assert.equal(server.normalizeIndianMobile('98765 43210'), '+919876543210');
  assert.equal(server.normalizeIndianMobile('+91-98765-43210'), '+919876543210');
  assert.equal(server.normalizeIndianMobile('09876543210'), '+919876543210');
  assert.equal(server.normalizeIndianMobile('919876543210'), '+919876543210');
  assert.equal(server.normalizeIndianMobile('12345 67890'), null);
  assert.equal(server.normalizeIndianMobile('98765'), null);
});

test('validateInput explains problems in plain words', () => {
  const ok = { name: 'Sharma Tours', city: 'Jaipur', ownerName: 'Ramesh', ownerPhone: '9876543210' };
  assert.equal(server.validateInput(ok).ownerPhone, '+919876543210');
  assert.throws(() => server.validateInput({ ...ok, ownerPhone: '123' }), /10-digit/);
  assert.throws(() => server.validateInput({ ...ok, name: '' }), /business name/);
  assert.throws(() => server.validateInput({ ...ok, preferredSlug: 'admin' }), /reserved/);
});

test('browser and server rules agree', () => {
  assert.equal(client.SLUG_RE.source, server.SLUG_RE.source);
  assert.deepEqual([...client.RESERVED].sort(), [...server.RESERVED].sort());
  const names = [['Sharma Tours & Travels', 'Jaipur'], ['Admin', 'Delhi'], ['AB', 'Goa'], ['Café Trips', 'Kochi'],
    ['Very Long Business Name Tours And Travels', 'Thiruvananthapuram'], ['', ''], ['---', 'x']];
  for (const [n, c] of names) {
    assert.equal(client.slugify(n), server.slugify(n));
    assert.deepEqual(client.slugCandidates(n, c), server.slugCandidates(n, c));
  }
  for (const s of ['abc', 'admin', 'ab--c', '', 'x'.repeat(41)]) assert.equal(client.slugProblem(s), server.slugProblem(s));
  for (const p of ['9876543210', '+91 98765 43210', '123']) assert.equal(client.normalizeIndianMobile(p), server.normalizeIndianMobile(p));
});
