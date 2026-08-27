'use client';

import { useState } from 'react';
import { createAgreement } from './actions';

/**
 * Generates the agreement. Surfaces the reason when it fails, rather than
 * leaving a button that appears to do nothing.
 */
export default function CreateAgreementButton({
  jobId, studioId, html, label = 'Create agreement', className = 'btn-primary',
}: {
  jobId: string;
  studioId: string;
  html: string;
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setPending(true);
    setError('');
    const result = await createAgreement(jobId, studioId, html);
    // Success redirects; reaching here means it did not.
    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <>
      <button onClick={run} disabled={pending} className={className}>
        {pending ? 'Working…' : label}
      </button>
      {error && <p className="text-[12.5px] text-red-700 mt-2">{error}</p>}
    </>
  );
}
