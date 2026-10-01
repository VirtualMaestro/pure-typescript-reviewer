import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from './config.js';

test('loadConfig reads host and port', () => {
  assert.deepEqual(loadConfig('{"host":"localhost","port":80}'), { host: 'localhost', port: 80 });
});

test('loadConfig rejects a port that is not a number', () => {
  assert.throws(() => loadConfig('{"host":"localhost","port":"80"}'));
});
