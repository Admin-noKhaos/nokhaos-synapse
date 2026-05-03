// Synapse worker: polls webhook_events for unprocessed rows + runs AI replies.
// Also exposes a tiny HTTP server for Render's health probe (port 8080).

import { createServer } from 'node:http';
import { ENV } from './env.js';
import { db } from './db.js';
import { processWebhookEvent } from './processWebhook.js';

let processing = false;

async function tick() {
  if (processing) return;
  processing = true;
  try {
    const { data: rows, error } = await db
      .from('webhook_events')
      .select('id, payload')
      .is('processed_at', null)
      .eq('signature_valid', true)
      .order('received_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('poll error', error);
      return;
    }
    for (const row of rows ?? []) {
      try {
        await processWebhookEvent({ id: row.id, payload: row.payload as never });
      } catch (e) {
        console.error('processWebhookEvent threw', e);
      }
    }
  } finally {
    processing = false;
  }
}

setInterval(tick, ENV.POLL_INTERVAL_MS).unref();
tick();

createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end('not found');
}).listen(ENV.PORT, () => {
  console.log(`[worker] http :${ENV.PORT} · poll every ${ENV.POLL_INTERVAL_MS}ms`);
});
