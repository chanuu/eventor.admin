import Link from "next/link";
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CreateAgreementButton from './CreateAgreementButton';
import { buildAgreementHtml } from '@/lib/agreement';
import AgreementPanel from './AgreementPanel';

type Contract = {
  id: string;
  content_html: string | null;
  created_at: string | null;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  signature_data: string | null;
};

type Studio = {
  id: string; name: string; address: string | null; phone: string | null;
  email: string | null; logo_url: string | null;
  agreement_intro: string | null; agreement_terms: string | null;
};
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
      .select('id, content_html, status, sent_at, signed_at, signature_data, created_at')
      .eq('job_id', params.id)
      .maybeSingle(),
    supabase
      .from('studios')
      .select('id, name, address, phone, email, logo_url, agreement_intro, agreement_terms')
      .eq('id', job.studio_id)
      .single(),
  ]);

  const contract = contractRaw as Contract | null;
  const studio   = (studioRaw as Studio | null) ?? { id: job.studio_id, name: '', address: null, phone: null, email: null, logo_url: null, agreement_intro: null, agreement_terms: null };
  const client   = job.clients  as Client | null;
  const pkg      = job.packages as { name: string } | null;

  const resolvedTemplate = buildAgreementHtml({
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
    intro:          studio.agreement_intro,
    terms:          studio.agreement_terms,
  });


  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/jobs/${params.id}`} style={{ fontSize: 13, color: '#6b7280' }}>← {job.title}</Link>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Contract</h1>
      </div>

      {!contract ? (
        <div style={{ background: '#fff', border: '1px solid #E7EAE5', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#5b6660', marginBottom: 6 }}>
            No agreement for this job yet.
          </p>
          <p style={{ fontSize: 12.5, color: '#8b968f', marginBottom: 22, maxWidth: 420, marginInline: 'auto', lineHeight: 1.6 }}>
            It is generated from your studio details, this job, the client and the package —
            then sent to the client to read and sign in their portal.
          </p>
          <CreateAgreementButton jobId={job.id} studioId={job.studio_id} html={resolvedTemplate} />
        </div>
      ) : (
        <AgreementPanel
          contractId={contract.id}
          jobId={job.id}
          studioId={job.studio_id}
          clientName={client?.full_name ?? ''}
          contentHtml={contract.content_html}
          resolvedTemplate={resolvedTemplate}
          status={contract.status}
          createdAt={contract.created_at}
          sentAt={contract.sent_at}
          signedAt={contract.signed_at}
          signatureData={contract.signature_data}
        />
      )}
    </div>
  );
}

