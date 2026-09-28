import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mockLogger } from '../../tests/lib/logger-mock.js';

const mockSpawnSync = vi.fn();
vi.mock('../platform/spawn.js', () => ({
  spawnProcessSync: (...args: unknown[]) => mockSpawnSync(...args),
  spawnProcess: () => {
    throw new Error('sync test must not spawn async');
  },
}));
vi.mock('../logger/index.js', async () =>
  (await import('../../tests/lib/logger-mock.js')).loggerModuleMock(),
);

import { invalidateCodexBundledCache, reconcileCodexModelSelection } from './codex-config.js';

const syncOk = (stdout: string) => ({ status: 0, stdout, stderr: '' });
const CATALOG_JSON = JSON.stringify({
  models: [
    {
      slug: 'glm-5.3-flash',
      display_name: 'glm-5.3-flash',
      visibility: 'list',
      supported_in_api: true,
      priority: 1,
      supported_reasoning_levels: [{ effort: 'low' }],
    },
  ],
});

describe('reconcileCodexModelSelection', () => {
  let codexHome: string;

  beforeEach(() => {
    codexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-reconcile-'));
    fs.writeFileSync(
      path.join(codexHome, 'config.toml'),
      [
        'model_provider = "narwal_transit_glm"',
        'model = "glm-5.3-flash"',
        'model_catalog_json = "cc-switch-model-catalog.json"',
        '',
        '[model_providers.narwal_transit_glm]',
        'name = "narwal_transit_glm"',
      ].join('\n'),
    );
    fs.writeFileSync(path.join(codexHome, 'cc-switch-model-catalog.json'), CATALOG_JSON);
    mockSpawnSync.mockReset();
    mockSpawnSync.mockReturnValue(syncOk(CATALOG_JSON));
    mockLogger.warn.mockReset();
    invalidateCodexBundledCache();
  });

  afterEach(() => {
    fs.rmSync(codexHome, { recursive: true, force: true });
  });

  it('aligns a removed provider and unsupported model with codex config', () => {
    expect(
      reconcileCodexModelSelection(
        { model: 'deepseek-v4.1-flash', modelProvider: 'narwal_transit' },
        { codexHome },
      ),
    ).toEqual({
      changed: true,
      model: 'glm-5.3-flash',
      modelProvider: 'narwal_transit_glm',
    });
  });

  it('keeps a still-valid provider/model selection untouched', () => {
    expect(
      reconcileCodexModelSelection(
        { model: 'glm-5.3-flash', modelProvider: 'narwal_transit_glm' },
        { codexHome },
      ),
    ).toEqual({
      changed: false,
      model: 'glm-5.3-flash',
      modelProvider: 'narwal_transit_glm',
    });
  });
});
