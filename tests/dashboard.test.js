import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');

test('dashboard includes all requested business modules', () => {
  for (const section of ['Projecten', 'Materiaal', 'Inventaris', 'Facturatie', 'IT & support', 'Procedures']) {
    assert.ok(app.includes(section), `Missing module: ${section}`);
  }
});

test('dashboard has searchable projects and an empty state', () => {
  assert.match(app, /useMemo\(\(\) => projects\.filter/);
  assert.match(app, /Geen projecten gevonden/);
});

test('sample content is identified as demo data', () => {
  assert.match(app, /DEMO DATA/);
});
