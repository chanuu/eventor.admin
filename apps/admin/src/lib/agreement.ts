/**
 * Agreement document generation.
 *
 * The letterhead, details table and signature block are always generated; the
 * intro paragraph and the numbered clauses come from the studio's settings and
 * fall back to these defaults when unset.
 */

export const DEFAULT_TERMS: string[] = [
  'An advance payment is required to confirm the booking. The advance is non-refundable once the booking is confirmed.',
  'The remaining balance is due on or before the day of the event.',
  '{studio} will deliver fully edited photographs within the agreed timeline after the event.',
  'The client is responsible for coordinating schedules and ensuring timely access to all venues.',
  '{studio} retains full copyright and may use photographs for portfolio and promotional purposes unless a written non-disclosure agreement is signed.',
  'Cancellation within 30 days of the event will forfeit all advance payments. Cancellations before 30 days receive a 50% refund of the advance.',
  'If {studio} is unable to fulfil this contract due to an emergency, a full refund of all payments will be issued.',
  'Any additional scope (sessions, locations, services) must be agreed in writing and may attract extra charges.',
];

/** Terms as the settings textarea shows them — one clause per line. */
export function defaultTermsText(studioName: string): string {
  return DEFAULT_TERMS.map((t) => t.replaceAll('{studio}', studioName || 'The studio')).join('\n');
}

export type AgreementData = {
  studio_name: string; studio_address: string; studio_phone: string;
  studio_email: string; studio_logo: string;
  client_name: string; client_email: string; client_phone: string;
  job_title: string; event_type: string; package_name: string;
  total_price: string; contract_date: string;
  /** Studio overrides; null/empty falls back to the defaults above. */
  intro?: string | null;
  terms?: string | null;
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildAgreementHtml(d: AgreementData): string {
  const logoHtml = d.studio_logo
    ? `<div><img src="${d.studio_logo}" alt="${esc(d.studio_name)}" style="max-height:80px;max-width:240px;object-fit:contain;margin-bottom:10px;" /></div>`
    : '';

  const contactLine = [d.studio_phone, d.studio_email].filter(Boolean).map(esc).join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  const clauses = (d.terms?.trim() ? d.terms.split(/\r?\n/) : DEFAULT_TERMS)
    .map((line) => line.replaceAll('{studio}', d.studio_name).trim())
    .filter(Boolean)
    .map((line) => `<li>${esc(line)}</li>`)
    .join('\n');

  const introHtml = d.intro?.trim()
    ? `<p style="font-size:13px;color:#333;line-height:1.9;margin:0 0 24px;">${esc(d.intro.trim())}</p>`
    : '';

  const row = (label: string, value: string) =>
    `<tr><td style="padding:9px 14px;width:36%;background:#f5f5f5;font-weight:600;border:1px solid #ddd;">${label}</td><td style="padding:9px 14px;border:1px solid #ddd;">${esc(value)}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:0 auto;padding:48px 36px;color:#1a1a1a;line-height:1.7;">

<div style="text-align:center;margin-bottom:36px;padding-bottom:28px;border-bottom:2px solid #1a1a1a;">
${logoHtml}
<h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">${esc(d.studio_name)}</h1>
<p style="font-size:13px;color:#555;margin:4px 0;">${esc(d.studio_address)}</p>
<p style="font-size:13px;color:#555;margin:4px 0;">${contactLine}</p>
</div>

<h2 style="text-align:center;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:32px;">Photography Services Agreement</h2>

<table style="width:100%;border-collapse:collapse;margin-bottom:32px;font-size:14px;">
${row('Client Name', d.client_name)}
${row('Email', d.client_email)}
${row('Phone', d.client_phone)}
${row('Event / Job', d.job_title)}
${row('Event Type', d.event_type)}
${row('Package', d.package_name)}
${row('Contract Date', d.contract_date)}
<tr style="background:#1a1a1a;color:#fff;">
  <td style="padding:9px 14px;font-weight:700;border:1px solid #1a1a1a;">Total Price</td>
  <td style="padding:9px 14px;font-weight:700;font-size:16px;border:1px solid #1a1a1a;">LKR ${esc(d.total_price)}</td>
</tr>
</table>

${introHtml}

<h3 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;">Terms &amp; Conditions</h3>
<ol style="font-size:13px;line-height:2;color:#333;padding-left:20px;margin-bottom:32px;">
${clauses}
</ol>

<div style="margin-top:48px;padding-top:28px;border-top:1px solid #ccc;">
<p style="font-size:13px;color:#555;margin-bottom:32px;">By signing below, I, <strong>${esc(d.client_name)}</strong>, confirm that I have read, understood, and agree to all the terms of this Photography Services Agreement with ${esc(d.studio_name)}.</p>
<div style="display:flex;gap:48px;">
<div style="flex:1;"><div style="height:52px;border-bottom:1px solid #333;margin-bottom:8px;"></div><p style="font-size:12px;color:#888;margin:0;">Client signature &amp; date</p></div>
<div style="flex:1;"><div style="height:52px;border-bottom:1px solid #333;margin-bottom:8px;"></div><p style="font-size:12px;color:#888;margin:0;">${esc(d.studio_name)} — authorised signatory</p></div>
</div>
</div>

</body>
</html>`;
}
