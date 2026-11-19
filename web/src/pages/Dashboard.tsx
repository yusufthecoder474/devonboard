import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api('/api/dashboard?days=14').then(setD).catch(() => {}); }, []);
  if (!d) return <p>Loading…</p>;
  return (
    <div>
      <h1>Usage dashboard</h1>
      <div className="grid">
        <div className="card stat"><span>Total calls (14d)</span><b>{d.totalCalls}</b></div>
        <div className="card stat"><span>Error rate</span><b>{(d.errorRate * 100).toFixed(1)}%</b></div>
        <div className="card stat"><span>p95 latency</span><b>{d.p95LatencyMs} ms</b></div>
      </div>
      <div className="card"><h2>Calls per day</h2>
        <ResponsiveContainer width="100%" height={260}><LineChart data={d.callsPerDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="count" stroke="#111" strokeWidth={2} /></LineChart></ResponsiveContainer>
      </div>
      <div className="card"><h2>Keys</h2>
        <table><thead><tr><th>Prefix</th><th>Name</th><th>Last used</th><th>Status</th></tr></thead>
        <tbody>{d.keys.map((k: any) => <tr key={k.id}><td>{k.prefix}…</td><td>{k.name}</td><td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}</td><td>{k.revokedAt ? 'Revoked' : 'Active'}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
