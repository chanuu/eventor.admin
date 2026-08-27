'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { AgreementDocument } from '@/app/(dashboard)/jobs/[id]/contract/AgreementPanel';
import { saveAgreementTerms } from './agreement-actions';

export default function AgreementTerms({
  studioId, studioName, intro, terms, defaultTerms, previewHtml,
}: {
  studioId: string;
  studioName: string;
  intro: string;
  terms: string;
  defaultTerms: string;
  /** Sample document built from the saved terms, for the preview dialog. */
  previewHtml: string;
}) {
  const [introText, setIntroText] = useState(intro);
  const [termsText, setTermsText] = useState(terms || defaultTerms);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);

  const clauseCount = termsText.split(/\r?\n/).filter((l) => l.trim()).length;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    const result = await saveAgreementTerms(studioId, new FormData(e.currentTarget));
    setSaving(false);
    if (result?.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="bg-white rounded-2xl border border-line shadow-card p-6 mt-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-primary">Agreement terms</h2>
          <p className="text-[12.5px] text-ink-muted mt-1">
            The clauses that appear in every agreement you send. The letterhead, client details and
            signature block are generated automatically.
          </p>
        </div>
        <button type="button" onClick={() => setPreview(true)} className="btn-secondary">
          Preview document
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-5">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink-strong">Opening paragraph (optional)</label>
          <textarea
            name="intro"
            rows={3}
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            placeholder="A sentence or two setting out what this agreement covers. Leave empty to omit."
            className="input h-auto py-2.5 leading-relaxed"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink-strong">
            Terms &amp; conditions — one clause per line
          </label>
          <textarea
            name="terms"
            rows={12}
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
            className="input h-auto py-2.5 leading-relaxed font-mono text-[12.5px]"
          />
          <p className="text-[12px] text-ink-muted mt-1">
            {clauseCount} clause{clauseCount === 1 ? '' : 's'}. They are numbered automatically.
            Write <code className="bg-panel px-1 rounded">{'{studio}'}</code> to insert your studio
            name ({studioName || 'your studio'}).
          </p>
        </div>

        {error && <p className="text-[12.5px] text-red-600">{error}</p>}
        {saved && <p className="text-[12.5px] text-green-700 font-semibold">Agreement terms saved.</p>}

        <div className="flex gap-2 flex-wrap">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save terms'}
          </button>
          <button
            type="button"
            onClick={() => setTermsText(defaultTerms)}
            className="btn-secondary"
          >
            Restore defaults
          </button>
        </div>

        <p className="text-[12px] text-ink-muted leading-relaxed">
          Changes apply to agreements created from now on. Agreements already sent or signed keep the
          wording they were issued with.
        </p>
      </form>

      <Modal open={preview} onClose={() => setPreview(false)} title="Agreement preview" width="max-w-3xl">
        <AgreementDocument html={previewHtml} />
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-line">
          <button onClick={() => setPreview(false)} className="btn-secondary">Close</button>
        </div>
      </Modal>
    </div>
  );
}
