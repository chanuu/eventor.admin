'use client';

import { useState } from 'react';
import { updatePageCaption } from './actions';

/** Caption saves on blur so studios can tab straight down the page list. */
export default function PageCaptionField({ pageId, jobId, studioId, initial }: {
  pageId: string; jobId: string; studioId: string; initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (value === initial) return;
    setSaving(true);
    await updatePageCaption(pageId, jobId, studioId, value);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder="Caption (optional)"
        style={{
          flex: 1, minWidth: 0, height: 32, borderRadius: 8, border: '1px solid #D8E0DC',
          padding: '0 10px', fontSize: 13, color: '#123528', background: '#fff',
        }}
      />
      {saving && <span style={{ fontSize: 11, color: '#8b968f' }}>Saving…</span>}
      {saved && <span style={{ fontSize: 11, color: '#3f6b2b', fontWeight: 700 }}>Saved</span>}
    </div>
  );
}
