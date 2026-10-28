// fetch with a timeout. Returns parsed JSON or null; never throws, so one dead source
// can't take the page down. `revalidate` lets Vercel's data cache share results.
export async function getJson(url, { headers = {}, revalidate = 120, timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json', ...headers },
      signal: ctrl.signal,
      next: { revalidate },
    });
    if (!res.ok) {
      console.warn(`[source] ${res.status} ${url}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[source] failed ${url}: ${e.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
