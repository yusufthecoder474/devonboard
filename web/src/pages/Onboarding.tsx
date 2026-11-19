import { useEffect, useState } from 'react';
import { api, sandbox } from '../api';
import type { User } from '../App';
type Key = { id: string; prefix: string; name: string; revokedAt: string | null; lastUsedAt: string | null };
export default function Onboarding({ user }: { user: User }) {
  const [keys, setKeys] = useState<Key[]>([]);
  const [fullKey, setFullKey] = useState('');
  const [lang, setLang] = useState<'curl' | 'python' | 'javascript'>('curl');
  const [msg, setMsg] = useState('Hello DevOnboard');
  const [result, setResult] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const active = keys.find(k => !k.revokedAt);
  async function load() { const d = await api('/api/keys?page=1&limit=20'); setKeys(d.items); }
  useEffect(() => { load(); }, []);
  async function createKey() {
    const d = await api('/api/keys', { method: 'POST', body: JSON.stringify({ name: 'default' }) });
    setFullKey(d.key); load();
  }
  const key = fullKey || '';
  const snippet = lang === 'curl'
    ? `curl -X POST http://localhost:4000/v1/echo -H "x-api-key: ${key || 'YOUR_KEY'}" -H "Content-Type: application/json" -d '{"message":"Hello DevOnboard"}'`
    : lang === 'python'
    ? `import requests\nr = requests.post("http://localhost:4000/v1/echo", headers={"x-api-key": "${key || 'YOUR_KEY'}"}, json={"message": "Hello DevOnboard"})\nprint(r.json())`
    : `const r = await fetch("http://localhost:4000/v1/echo", { method: "POST", headers: { "x-api-key": "${key || 'YOUR_KEY'}", "Content-Type": "application/json" }, body: JSON.stringify({ message: "Hello DevOnboard" }) });\nconsole.log(await r.json());`;
  async function copy() {
    await navigator.clipboard.writeText(snippet);
    await api('/api/events', { method: 'POST', body: JSON.stringify({ type: 'snippet_copied' }) }).catch(() => {});
  }
  async function testCall() {
    setErr(''); setResult('');
    if (!fullKey) { setErr('Create a key first — the full key is shown only once.'); return; }
    try {
      const d = await sandbox('/v1/echo', fullKey, { message: msg });
      setResult(JSON.stringify(d)); setDone(true);
      await api('/api/events', { method: 'POST', body: JSON.stringify({ type: 'first_call_success' }) }).catch(() => {});
    } catch (e: any) { setErr(e.message); }
  }
  const steps = [
    { label: 'Create an API key', done: !!active },
    { label: 'Copy the snippet', done: !!key },
    { label: 'Run the test call', done },
    { label: 'First successful call', done },
  ];
  return (
    <div>
      <h1>Your first API call</h1>
      <p>You are on variant <b>{user.variant}</b> {user.variant === 'A' ? '(step-by-step checklist)' : '(single-page quickstart)'} — assigned deterministically from your user id.</p>
      {user.variant === 'A' && <div className="card"><h2>Checklist</h2>{steps.map((s, i) => <p key={i}>{s.done ? '✅' : '⬜'} {i + 1}. {s.label}</p>)}</div>}
      <div className="card">
        <h2>1. API key</h2>
        {!active ? <button onClick={createKey}>Create API key</button> : <p>Active key: <code>{active.prefix}…</code></p>}
        {fullKey && <p><b>Copy this now — it will not be shown again:</b><br /><code>{fullKey}</code></p>}
        {active && !fullKey && <p>Your key was created in an earlier session. Rotate it to get a new full key.</p>}
        {active && <button className="secondary" onClick={async () => { const d = await api(`/api/keys/${active.id}/rotate`, { method: 'POST' }); setFullKey(d.key); load(); }}>Rotate key</button>}
      </div>
      <div className="card">
        <h2>2. Snippet</h2>
        <button className={lang === 'curl' ? '' : 'secondary'} onClick={() => setLang('curl')}>curl</button>
        <button className={lang === 'python' ? '' : 'secondary'} onClick={() => setLang('python')}>Python</button>
        <button className={lang === 'javascript' ? '' : 'secondary'} onClick={() => setLang('javascript')}>JavaScript</button>
        <pre>{snippet}</pre>
        <button className="secondary" onClick={copy}>Copy snippet</button>
      </div>
      <div className="card">
        <h2>{user.variant === 'A' ? '3. Test call' : 'Try it live'}</h2>
        <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Message to echo" />
        <button onClick={testCall}>Test call</button>
        {result && <p className="success">Success: <code>{result}</code></p>}
        {err && <p className="error">{err}</p>}
        {done && <p className="success">🎉 First successful call recorded.</p>}
      </div>
    </div>
  );
}
