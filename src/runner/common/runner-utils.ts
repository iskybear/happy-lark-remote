import type { AgentEvent } from '../types.js';

/**
 * Build a synthetic system.init event for pre-spawn failure paths.
 *
 * When the runner exits before spawning a process (e.g. ENOENT spawn failure),
 * no real system.init arrives from stdout. Without a
 * synthetic init, the bridge's pre-init result guard (§9.22) and the run-state
 * reducer's sessionId check would silently drop the error result, leaving the
 * card showing "输出流已结束，但未收到 result 事件" instead of the actual
 * error message. The synthetic init satisfies both guards so the real error
 * result is processed normally.
 *
 * `model` 可选：协议类 runner（app-server/ACP）没有 init 通知，其合成 init 由
 * ConnectionBasedRunner 经此函数补发；模型名从握手响应取（取不到传空串，卡片
 * 自动隐藏 Model 行，见 formatUsageStats）。
 */
export function syntheticInitEvent(sessionId = '', model = ''): AgentEvent {
  return {
    type: 'system',
    subtype: 'init',
    session_id: sessionId,
    cwd: '',
    model,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a standardized auth/error result event for yield.
 *
 * Used when initialization or request sending fails (e.g. not logged in,
 * session creation failed). Produces a
 * `result`/`error` event so the bridge can render a card instead of crashing.
 */
export function authErrorEvent(errorMessage: string, sessionId = ''): AgentEvent {
  return {
    type: 'result',
    subtype: 'error',
    session_id: sessionId,
    errorMessage,
    timestamp: new Date().toISOString(),
  };
}
