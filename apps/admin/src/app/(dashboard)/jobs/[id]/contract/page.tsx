import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ensureContract } from './actions';
import ContractEditor from './ContractEditor';

type Contract = {
  id: string;
  content_html: string | null;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  signature_data: string | null;
};

type Studio = { id: string; name: string; address: string | null; phone: string | null; email: string | null; logo_url: string | null };
type Client = { full_name: string; email: string | null; phone: string | null };
type Job    = { id: string; title: string; event_type: string | null; total_price: number; studio_id: string; clients: Client | null; packages: { name: string } | null };

export default async function ContractPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('id, title, event_type, total_price, studio_id, clients(full_name, email, phone), packages(name)')
    .eq('id', params.id)
    .single();

  if (!jobRaw) notFound();
  const job = jobRaw as unknown as Job;

  const [{ data: contractRaw }, { data: studioRaw }] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, content_html, status, sent_at, signed_at, signature_data')
      .eq('job_id', params.id)
      .maybeSingle(),
    supabase
      .from('studios')
      .select('id, name, address, phone, email, logo_url')
      .eq('id', job.studio_id)
      .single(),
  ]);

  const contract = contractRaw as Contract | null;
  const studio   = (studioRaw as Studio | null) ?? { id: job.studio_id, name: '', address: null, phone: null, email: null, logo_url: null };
  const client   = job.clients  as Client | null;
  const pkg      = job.packages as { name: string } | null;

  const createAction    = ensureContract.bind(null, job.id, job.studio_id);
  const resolvedTemplate = buildTemplate({
    studio_name:    studio.name,
    studio_address: studio.address ?? '',
    studio_phone:   studio.phone   ?? '',
    studio_email:   studio.email   ?? '',
    studio_logo:    studio.logo_url ?? '',
    client_name:    client?.full_name ?? '',
    client_email:   client?.email     ?? '',
    client_phone:   client?.phone     ?? '',
    job_title:      job.title,
    event_type:     job.event_type  ?? '',
    package_name:   pkg?.name       ?? '',
    total_price:    job.total_price.toLocaleString(),
    contract_date:  new Date().toLocaleDateString('en-LK', { dateStyle: 'long' }),
  });

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <a href={`/jobs/${params.id}`} style={{ fontSize: 13, color: '#6b7280' }}>← {job.title}</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Contract</h1>
      </div>

      {!contract ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>No contract created for this job yet.</p>
          <form action={createAction}>
            <button type="submit" style={primaryBtn}>Create contract</button>
          </form>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
          <ContractEditor
            contractId={contract.id}
            jobId={job.id}
            studioId={job.studio_id}
            initialHtml={contract.content_html}
            resolvedTemplate={resolvedTemplate}
            status={contract.status}
            sentAt={contract.sent_at}
            signedAt={contract.signed_at}
            signatureData={contract.signature_data}
          />
        </div>
      )}
    </div>
  );
}

// ── Template builder ──────────────────────────────────────────────────────────

function buildTemplate(d: {
  studio_name: string; studio_address: string; studio_phone: string; studio_email: string; studio_logo: string;
  client_name: string; client_email: string; client_phone: string;
  job_title: string; event_type: string; package_name: string; total_price: string; contract_date: string;
}): string {
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const logoHtml = d.studio_logo
    ? `<div><img src="${d.studio_logo}" alt="${e(d.studio_name)}" style="max-height:80px;max-width:240px;object-fit:contain;margin-bottom:10px;" /></div>`
    : '';

  const contactLine = [d.studio_phone, d.studio_email].filter(Boolean).map(e).join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  return `<!DOCTYPE html>
<html>
<body style="font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:0 auto;padding:48px 36px;color:#1a1a1a;line-height:1.7;">

<div style="text-align:center;margin-bottom:36px;padding-bottom:28px;border-bottom:2px solid #1a1a1a;">
${logoHtml}
<h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">${e(d.studio_name)}</h1>
<p style="font-size:13px;color:#555;margin:4px 0;">${e(d.studio_address)}</p>
<p style="font-size:13px;color:#555;margin:4px 0;">${contactLine}</p>
</div>

<h2 style="text-align:center;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:32px;">Photography Services Agreement</h2>

<table style="width:100%;border-collapse:collapse;margin-bottom:32px;font-size:14px;">
<tr><td style="padding:9px 14px;width:36%;background:#f5f5f5;font-weight:600;border:1px solid #ddd;">Client Name</td>  <td style="padding:9px 14px;border:1px solid #ddd;">${e(d.client_name)}</td></tr>
<tr><td style="padding:9px 14px;background:#f5f5f5;font-weight:600;border:1px solid #ddd;">Email</td>               <td style="padding:9px 14px;border:1px solid #ddd;">${e(d.client_email)}</td></tr>
<tr><td style="padding:9px 14px;background:#f5f5f5;font-weight:600;border:1px solid #ddd;">Phone</td>               <td style="padding:9px 14px;border:1px solid #ddd;">${e(d.client_phone)}</td></tr>
<tr><td style="padding:9px 14px;background:#f5f5f5;font-weight:600;border:1px solid #ddd;">Event / Job</td>         <td style="padding:9px 14px;border:1px solid #ddd;">${e(d.job_title)}</td></tr>
<tr><td style="padding:9px 14px;background:#f5f5f5;font-weight:600;border:1px solid #ddd;">Event Type</td>          <td style="padding:9px 14px;border:1px solid #ddd;">${e(d.event_type)}</td></tr>
<tr><td style="padding:9px 14px;background:#f5f5f5;font-weight:600;border:1px solid #ddd;">Package</td>             <td style="padding:9px 14px;border:1px solid #ddd;">${e(d.package_name)}</td></tr>
<tr><td style="padding:9px 14px;background:#f5f5f5;font-weight:600;border:1px solid #ddd;">Contract Date</td>       <td style="padding:9px 14px;border:1px solid #ddd;">${e(d.contract_date)}</td></tr>
<tr style="background:#1a1a1a;color:#fff;">
  <td style="padding:9px 14px;font-weight:700;border:1px solid #1a1a1a;">Total Price</td>
  <td style="padding:9px 14px;font-weight:700;font-size:16px;border:1px solid #1a1a1a;">LKR ${e(d.total_price)}</td>
</tr>
</table>

<h3 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;">Terms &amp; Conditions</h3>
<ol style="font-size:13px;line-height:2;color:#333;padding-left:20px;margin-bottom:32px;">
<li>An advance payment is required to confirm the booking. The advance is non-refundable once the booking is confirmed.</li>
<li>The remaining balance is due on or before the day of the event.</li>
<li>${e(d.studio_name)} will deliver fully edited photographs within the agreed timeline after the event.</li>
<li>The client is responsible for coordinating schedules and ensuring timely access to all venues.</li>
<li>${e(d.studio_name)} retains full copyright and may use photographs for portfolio and promotional purposes unless a written non-disclosure agreement is signed.</li>
<li>Cancellation within 30 days of the event will forfeit all advance payments. Cancellations before 30 days receive a 50% refund of the advance.</li>
<li>If ${e(d.studio_name)} is unable to fulfil this contract due to an emergency, a full refund of all payments will be issued.</li>
<li>Any additional scope (sessions, locations, services) must be agreed in writing and may attract extra charges.</li>
</ol>

<div style="margin-top:48px;padding-top:28px;border-top:1px solid #ccc;">
<p style="font-size:13px;color:#555;margin-bottom:32px;">By signing below, I, <strong>${e(d.client_name)}</strong>, confirm that I have read, understood, and agree to all the terms of this Photography Services Agreement with ${e(d.studio_name)}.</p>
<div style="display:flex;gap:48px;">
<div style="flex:1;"><div style="height:52px;border-bottom:1px solid #333;margin-bottom:8px;"></div><p style="font-size:12px;color:#888;margin:0;">Client signature &amp; date</p></div>
<div style="flex:1;"><div style="height:52px;border-bottom:1px solid #333;margin-bottom:8px;"></div><p style="font-size:12px;color:#888;margin:0;">${e(d.studio_name)} — authorised signatory</p></div>
</div>
</div>

</body>
</html>`;
}

const primaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 20px', fontSize: 14 };
