// Synapse worker: polls webhook_events for unprocessed rows + runs AI replies.
// Also exposes a tiny HTTP server for Render's health probe (port 8080).

import { createServer } from 'node:http';
import { ENV } from './env.js';
import { db } from './db.js';
import { processWebhookEvent } from './processWebhook.js';
import { pollComments } from './commentPoller.js';

let processing = false;

let lastTickAt = 0;
let totalProcessed = 0;

async function tick() {
  if (processing) return;
  processing = true;
  lastTickAt = Date.now();
  try {
    const { data: rows, error } = await db
      .from('webhook_events')
      .select('id, payload')
      .is('processed_at', null)
      .eq('signature_valid', true)
      .order('received_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('[poll] query error', error.message);
      return;
    }
    if (rows && rows.length > 0) {
      console.log(`[poll] found ${rows.length} unprocessed events`);
    }
    for (const row of rows ?? []) {
      try {
        await processWebhookEvent({ id: row.id, payload: row.payload as never });
        totalProcessed++;
      } catch (e) {
        console.error('[poll] processWebhookEvent threw', e);
      }
    }
  } finally {
    processing = false;
  }
}

setInterval(tick, ENV.POLL_INTERVAL_MS).unref();
tick();

// Slower comment-polling backstop for posts Instagram never webhooks.
async function commentTick() {
  try {
    await pollComments();
  } catch (e) {
    console.error('[comment-poll] tick threw', e);
  }
}
setInterval(commentTick, ENV.COMMENT_POLL_INTERVAL_MS).unref();
commentTick();

createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      ts: new Date().toISOString(),
      last_tick_ms_ago: lastTickAt ? Date.now() - lastTickAt : null,
      total_processed: totalProcessed,
    }));
    return;
  }
  res.writeHead(404);
  res.end('not found');
}).listen(ENV.PORT, () => {
  console.log(`[worker] http :${ENV.PORT} · poll every ${ENV.POLL_INTERVAL_MS}ms`);
});
