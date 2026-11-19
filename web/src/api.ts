const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `Request failed: ${r.status}`);
  return data;
}
export async function sandbox(path: string, key: string, body: any) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `Sandbox failed: ${r.status}`);
  return data;
}
