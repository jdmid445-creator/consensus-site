// Claude via the Messages API. Structured output is forced through a single tool,
// so the page always gets the fields it expects (or null if the call fails).
const API = `${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`;

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

// The last failure, kept short and without secrets, so /api/meta can show why the read is missing.
let lastError = '';
export const aiLastError = () => lastError;

// Models to try in order. If one isn't available on this key (404, or a 400 that names the
// model) the next one is used; a busy or rate-limited answer is retried once after a pause.
function models(model) {
  return [...new Set([model, process.env.ANTHROPIC_MODEL, 'claude-sonnet-5-5', 'claude-sonnet-4-5', 'claude-haiku-5-5'].filter(Boolean))];
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function callOnce({ system, prompt, tool, maxTokens, model, signal }) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 400).replace(/sk-ant-[\w-]+/g, '[key]');
    return { status: res.status, body };
  }
  return { status: 200, data: await res.json() };
}

export async function askClaude({ system, prompt, tool, maxTokens = 1800, timeoutMs = 50000, model }) {
  if (!aiEnabled()) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    for (const m of models(model)) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await callOnce({ system, prompt, tool, maxTokens, model: m, signal: ctrl.signal });
        if (r.status === 200) {
          const block = (r.data.content || []).find((b) => b.type === 'tool_use' && b.name === tool.name);
          lastError = block ? "" : `no structured answer (stop: ${r.data.stop_reason})`;
          if (block) return block.input;
          break;
        }
        lastError = `HTTP ${r.status}: ${r.body.slice(0, 200).replace(/claude[\w.-]*/gi, "model")}`;
        console.warn('[ai]', lastError);
        if ([429, 500, 502, 503, 529].includes(r.status) && attempt === 0) { await wait(1500); continue; }
        break;
      }
      // Only move to another model when this one isn't available on the key.
      if (!/model|not_found/i.test(lastError)) return null;
    }
    return null;
  } catch (e) {
    lastError = e.name === 'AbortError' ? 'timed out' : e.message;
    console.warn('[ai] failed:', lastError);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const clean = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');
export const str = clean;
export const strList = (xs, n, max) => (Array.isArray(xs) ? xs.map((x) => clean(x, max)).filter(Boolean).slice(0, n) : []);
