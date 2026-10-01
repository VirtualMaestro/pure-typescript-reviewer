import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReport, type Row } from './report.js';

test('buildReport leaves rows sorted by name for the pager', () => {
  const rows: Row[] = [{ name: 'beta', total: 2 }, { name: 'alpha', total: 1 }];
  buildReport(rows);
  assert.deepEqual(rows.map((row) => row.name), ['alpha', 'beta']);
});

test('buildReport renders 1 line per row', () => {
  assert.equal(buildReport([{ name: 'alpha', total: 1 }]), 'alpha: 1');
});
