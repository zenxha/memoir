import { initClient, tsRestFetchClient } from '@ts-rest/core';
import { contract } from '@memoir/contract';

export const api = initClient(contract, {
  baseUrl: '',
  baseHeaders: {},
  api: tsRestFetchClient,
});

export type WsMessage =
  | { type: 'entry:new';     payload: import('@memoir/contract').Entry }
  | { type: 'entry:updated'; payload: import('@memoir/contract').Entry }
  | { type: 'entry:deleted'; payload: { id: string } }
  | { type: 'connected' };

export function createWsClient(onMessage: (msg: WsMessage) => void) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen    = () => document.dispatchEvent(new Event('ws:open'));
  ws.onclose   = () => { document.dispatchEvent(new Event('ws:close')); setTimeout(() => createWsClient(onMessage), 3000); };
  ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch { /* ignore */ } };
  return ws;
}
