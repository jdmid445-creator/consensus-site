import { after } from 'next/server';

// twitterapi.io calls go through one line, a few seconds apart, so the free tier's
// one-request-every-5-seconds limit never rejects them. X_API_GAP_MS can lower it on a paid plan.
const GAP = Number(process.env.X_API_GAP_MS || 5200);
let chain = Promise.resolve();
let last = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function xget(url) {
  const run = async () => {
    const wait = last + GAP - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    return fetch(url, { headers: { 'x-api-key': process.env.TWITTERAPI_IO_KEY }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

// Run slow refresh work after the response is sent; fall back to running it now.
export function later(fn) {
  try { after(() => fn().catch(() => {})); return true; } catch { return false; }
}
