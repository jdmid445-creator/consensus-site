// Claude via the Messages API. Structured output is forced through a single tool,
// so the page always gets the fields it expects (or null if the call fails).
const API = `${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`;

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

// The last failure, kept short and without secrets, so /api/meta can show why the read is missing.
let lastError = '';
export const aiLastError = () => lastError;

export async function askClaude({ system, prompt, tool, maxTokens = 1800, timeoutMs = 45000, model }) {
  if (!aiEnabled()) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: maxTokens,
        system,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      lastError = `HTTP ${res.status}: ${body.replace(/sk-ant-[\w-]+/g, '[key]').slice(0, 200)}`;
      console.warn('[ai]', lastError);
      return null;
    }
    const data = await res.json();
    const block = (data.content || []).find((b) => b.type === 'tool_use' && b.name === tool.name);
    if (!block) lastError = `no structured answer (stop: ${data.stop_reason})`;
    else lastError = '';
    return block?.input || null;
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
