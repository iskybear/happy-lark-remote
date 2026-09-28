import { describe, it, expect } from 'vitest';
import { authErrorEvent, syntheticInitEvent } from './runner-utils.js';

describe('syntheticInitEvent', () => {
  it('defaults model to empty string when the runner cannot resolve it', () => {
    // 空串而非 undefined：卡片两侧（formatUsageStats / formatCompactStatus）都按
    // falsy 跳过 Model 行，取不到模型时不得伪造。
    expect(syntheticInitEvent('sess-1')).toEqual({
      type: 'system',
      subtype: 'init',
      session_id: 'sess-1',
      cwd: '',
      model: '',
      timestamp: expect.any(String),
    });
  });

  it('carries the effective model when the runner reports one', () => {
    expect(syntheticInitEvent('th-1', 'deepseek-v4-flash').model).toBe('deepseek-v4-flash');
  });
});

describe('authErrorEvent', () => {
  it('returns correct event structure with message only', () => {
    const event = authErrorEvent('not logged in');
    expect(event).toEqual({
      type: 'result',
      subtype: 'error',
      session_id: '',
      errorMessage: 'not logged in',
      timestamp: expect.any(String),
    });
    // Verify timestamp is a valid ISO string
    expect(new Date(event.timestamp!).toISOString()).toBe(event.timestamp);
  });

  it('includes sessionId when provided', () => {
    const event = authErrorEvent('auth failed', 'sess-123');
    expect(event).toEqual({
      type: 'result',
      subtype: 'error',
      session_id: 'sess-123',
      errorMessage: 'auth failed',
      timestamp: expect.any(String),
    });
  });
});
