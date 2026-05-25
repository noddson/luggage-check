import test from 'node:test';
import assert from 'node:assert/strict';
import { t, localizeEntity } from '../src/i18n/index.js';

test('t resolves from active language then fallback', () => {
  assert.equal(t({ language: 'en' }, 'pageTitle'), 'Luggage Check');
  assert.equal(t({ language: 'unknown' }, 'pageTitle'), 'Luggage Check');
});

test('localizeEntity token and fallback', () => {
  const entity = { label: '@i18n:title', translations: { en: { title: 'Title' }, xx: { title: 'Arrr' } } };
  assert.equal(localizeEntity({ language: 'xx' }, entity, 'label'), 'Arrr');
  assert.equal(localizeEntity({ language: 'fr' }, entity, 'label'), 'Title');
});
