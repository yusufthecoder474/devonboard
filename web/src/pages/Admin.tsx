import { useEffect, useState } from 'react';
import { api } from '../api';
export default function Admin() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api('/api/admin/funnel').then(setD).catch(() => {}); }, []);
  if (!d) return <p>Loading…</p>;
  return (
    <div>
      <h1>Activation funnel &amp; experiment</h1>
      <p>Synthetic seed data — illustrative only, not evidence about real developers.</p>
      <div className="card"><table>
        <thead><tr><th>Variant</th><th>Users</th><th>Key created</th><th>Snippet copied</th><th>First call</th><th>Conversion</th><th>Median time to first call</th></tr></thead>
        <tbody>{d.variants.map((v: any) => <tr key={v.variant}><td>{v.variant}</td><td>{v.users}</td><td>{v.keyCreated}</td><td>{v.snippetCopied}</td><td>{v.firstCallSuccess}</td><td>{(v.conversionToFirstCall * 100).toFixed(1)}%</td><td>{v.medianMsToFirstCall === null ? '—' : `${Math.round(v.medianMsToFirstCall / 1000)}s`}</td></tr>)}</tbody>
      </table></div>
      <div className="card"><h2>Two-proportion z-test (first-call conversion, A vs B)</h2>
        <p>z = {d.zTest.z.toFixed(3)} · p = {d.zTest.p.toFixed(4)}</p>
        <p>{d.zTest.p < 0.05 ? 'Difference is significant at p < 0.05.' : 'No significant difference at p < 0.05.'} A p-value alone does not prove the variant caused the change.</p>
      </div>
    </div>
  );
}
