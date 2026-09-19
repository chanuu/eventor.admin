import { requireFeature } from '@/lib/staff';
import Link from "next/link";
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isS3Url } from '@/lib/s3';
import {
  createAlbum, updateAlbum, setAlbumStatus,
  addSelectedPhotos, movePage, deletePage, removeAlbumMusic,
} from './actions';
import AlbumPageUploader from './AlbumPageUploader';
import PageCaptionField from './PageCaptionField';
import MusicUploader from './MusicUploader';
import AlbumSharing from './AlbumSharing';

type Job = { id: string; title: string; studio_id: string; event_type: string | null };
type StudioRow = { portal_url: string | null };

type Album = {
  id: string; title: string | null;
  cover_kicker: string | null; cover_title: string | null; cover_body: string | null;
  closing_kicker: string | null; closing_title: string | null; closing_body: string | null;
  music_enabled: boolean; music_url: string | null; music_name: string | null;
  share_token: string; is_public: boolean; autoplay: boolean; autoplay_seconds: number;
  status: string; published_at: string | null;
};

type PageRow = {
  id: string; caption: string | null; sort_order: number;
  image_url: string | null;
  gallery_photos: { storage_path: string; file_name: string } | null;
};

export default async function AlbumBuilderPage({ params, searchParams }: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  await requireFeature('album');
  const supabase = createClient();

  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('id, title, studio_id, event_type')
    .eq('id', params.id)
    .single();
  if (!jobRaw) notFound();
  const job = jobRaw as Job;

  const { data: albumRaw } = await supabase
    .from('albums')
    .select('id, title, cover_kicker, cover_title, cover_body, closing_kicker, closing_title, closing_body, music_enabled, music_url, music_name, share_token, is_public, autoplay, autoplay_seconds, status, published_at')
    .eq('job_id', params.id)
    .maybeSingle();
  const album = albumRaw as Album | null;

  const { data: studioRaw } = await supabase
    .from('studios').select('portal_url').eq('id', job.studio_id).maybeSingle();
  const portalUrl = (studioRaw as StudioRow | null)?.portal_url?.trim()
    || process.env.NEXT_PUBLIC_PORTAL_URL
    || '';

  if (!album) {
    return (
      <div style={{ maxWidth: 700 }}>
        <Header jobId={params.id} jobTitle={job.title} />
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 14, color: '#5b6660', marginBottom: 20 }}>
            No digital album for this job yet.
          </p>
          <form action={createAlbum.bind(null, job.id, job.studio_id, job.title)}>
            <button type="submit" style={primaryBtn}>Create digital album</button>
          </form>
        </div>
      </div>
    );
  }

  const { data: pagesRaw } = await supabase
    .from('album_pages')
    .select('id, caption, sort_order, image_url, gallery_photos(storage_path, file_name)')
    .eq('album_id', album.id)
    .order('sort_order');
  const pages = (pagesRaw ?? []) as unknown as PageRow[];

  // Legacy gallery photos may still be Supabase storage paths.
  const legacy = pages
    .map((p) => p.gallery_photos?.storage_path)
    .filter((s): s is string => !!s && !isS3Url(s));
  const signed: Record<string, string> = {};
  if (legacy.length) {
    const { data } = await createAdminClient().storage
      .from('gallery-photos')
      .createSignedUrls(legacy, 3600);
    data?.forEach((s, i) => { if (s.signedUrl) signed[legacy[i]] = s.signedUrl; });
  }

  const imageFor = (p: PageRow): string | null => {
    if (p.image_url) return p.image_url;
    const path = p.gallery_photos?.storage_path;
    if (!path) return null;
    return isS3Url(path) ? path : signed[path] ?? null;
  };

  const published = album.status === 'published';

  return (
    <div style={{ maxWidth: 860 }}>
      <Header jobId={params.id} jobTitle={job.title} />
      {searchParams.saved && (
        <p style={{ fontSize: 13, color: '#16a34a', marginBottom: 12 }}>Changes saved.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Status */}
        <div style={card}>
          <h2 style={sectionHeading}>Status</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: published ? '#166534' : '#8b968f' }}>
                ● {published ? 'Published' : 'Draft'}
              </span>
              <p style={{ fontSize: 12.5, color: '#8b968f', margin: '4px 0 0' }}>
                {published
                  ? `Visible to the client since ${new Date(album.published_at!).toLocaleDateString('en-LK', { dateStyle: 'medium' })}`
                  : 'Only your studio can see this album.'}
              </p>
            </div>
            {pages.length > 0 ? (
              <form action={setAlbumStatus.bind(null, album.id, params.id, job.studio_id, published ? 'draft' : 'published')}>
                <button type="submit" style={published ? ghostBtn : primaryBtn}>
                  {published ? 'Unpublish' : 'Publish to client'}
                </button>
              </form>
            ) : (
              <span style={{ fontSize: 12, color: '#a8631f' }}>Add at least one page to publish</span>
            )}
          </div>
        </div>

        {/* Config */}
        <div style={card}>
          <h2 style={sectionHeading}>Album Settings</h2>
          <form action={updateAlbum.bind(null, album.id, params.id, job.studio_id)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Album title">
              <input name="title" defaultValue={album.title ?? ''} placeholder={job.title} style={inputStyle} />
            </Field>

            <fieldset style={fieldset}>
              <legend style={legendStyle}>Cover page</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <Field label="Kicker (small caps line)">
                  <input name="cover_kicker" defaultValue={album.cover_kicker ?? ''} placeholder="Water's Edge · 12 May 2026" style={inputStyle} />
                </Field>
                <Field label="Title">
                  <input name="cover_title" defaultValue={album.cover_title ?? ''} placeholder={job.title} style={inputStyle} />
                </Field>
              </div>
              <Field label="Sub-line">
                <input name="cover_body" defaultValue={album.cover_body ?? ''} placeholder="A wedding album by your studio" style={inputStyle} />
              </Field>
            </fieldset>

            <fieldset style={fieldset}>
              <legend style={legendStyle}>Closing page</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <Field label="Kicker">
                  <input name="closing_kicker" defaultValue={album.closing_kicker ?? 'Thank you'} style={inputStyle} />
                </Field>
                <Field label="Title">
                  <input name="closing_title" defaultValue={album.closing_title ?? ''} placeholder="With love, Studio" style={inputStyle} />
                </Field>
              </div>
              <Field label="Sub-line">
                <input name="closing_body" defaultValue={album.closing_body ?? ''} placeholder="Photographed by …" style={inputStyle} />
              </Field>
            </fieldset>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#123528', cursor: 'pointer' }}>
              <input type="checkbox" name="music_enabled" defaultChecked={album.music_enabled} style={{ width: 16, height: 16, accentColor: '#8BC53F' }} />
              Offer background music in the album
            </label>

            <div>
              <button type="submit" style={primaryBtn}>Save settings</button>
            </div>
          </form>
        </div>

        {/* Soundtrack */}
        <div style={card}>
          <h2 style={sectionHeading}>Soundtrack</h2>
          {album.music_url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>🎵</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#123528', margin: 0 }}>
                  {album.music_name ?? 'Custom track'}
                </p>
                <audio controls preload="none" src={album.music_url} style={{ marginTop: 8, width: '100%', maxWidth: 380, height: 34 }} />
              </div>
              <form action={removeAlbumMusic.bind(null, album.id, params.id, job.studio_id, album.music_url)}>
                <button type="submit" style={{ ...ghostBtn, color: '#dc2626', borderColor: '#fecaca' }}>
                  Remove
                </button>
              </form>
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: '#8b968f', margin: '0 0 16px' }}>
              No track uploaded. The album plays a soft built-in instrumental instead — upload your own to replace it.
            </p>
          )}

          <MusicUploader
            albumId={album.id}
            jobId={params.id}
            studioId={job.studio_id}
            hasTrack={!!album.music_url}
          />

          {!album.music_enabled && (
            <p style={{ fontSize: 12, color: '#a8631f', marginTop: 12 }}>
              Music is switched off in the settings above, so the client won’t see a play button.
            </p>
          )}
        </div>

        <AlbumSharing
          albumId={album.id}
          jobId={params.id}
          studioId={job.studio_id}
          isPublic={album.is_public}
          shareToken={album.share_token}
          published={published}
          autoplay={album.autoplay}
          autoplaySeconds={album.autoplay_seconds}
          portalUrl={portalUrl}
        />

        {/* Pages */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ ...sectionHeading, marginBottom: 0 }}>
              {pages.length} Page{pages.length !== 1 ? 's' : ''}
            </h2>
            <form action={addSelectedPhotos.bind(null, album.id, params.id, job.studio_id)}>
              <button type="submit" style={ghostBtn}>Add photos the client selected</button>
            </form>
          </div>
          <p style={{ fontSize: 12.5, color: '#8b968f', margin: '8px 0 16px' }}>
            The cover and closing pages are generated from the settings above — these are the pages in between.
          </p>

          <AlbumPageUploader albumId={album.id} jobId={params.id} studioId={job.studio_id} />

          {pages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              {pages.map((p, i) => {
                const src = imageFor(p);
                return (
                  <div key={p.id} style={pageRow}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#8b968f', width: 24, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {src
                      ? <img src={src} alt="" style={{ width: 76, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                      : <div style={{ width: 76, height: 56, borderRadius: 8, background: '#EDEFEC', flexShrink: 0 }} />}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <PageCaptionField
                        pageId={p.id}
                        jobId={params.id}
                        studioId={job.studio_id}
                        initial={p.caption ?? ''}
                      />
                      <p style={{ fontSize: 11, color: '#8b968f', margin: '4px 0 0' }}>
                        {p.image_url ? 'Uploaded for this album' : `From gallery · ${p.gallery_photos?.file_name ?? ''}`}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <form action={movePage.bind(null, p.id, album.id, params.id, job.studio_id, 'up')}>
                        <button type="submit" disabled={i === 0} style={iconBtn(i === 0)} title="Move up">↑</button>
                      </form>
                      <form action={movePage.bind(null, p.id, album.id, params.id, job.studio_id, 'down')}>
                        <button type="submit" disabled={i === pages.length - 1} style={iconBtn(i === pages.length - 1)} title="Move down">↓</button>
                      </form>
                      <form action={deletePage.bind(null, p.id, params.id, job.studio_id, p.image_url)}>
                        <button type="submit" style={{ ...iconBtn(false), color: '#dc2626', borderColor: '#fecaca' }} title="Remove page">✕</button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <Link href={`/jobs/${jobId}`} style={{ fontSize: 13, color: '#8b968f' }}>← {jobTitle}</Link>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: '#0F3D2E' }}>Digital Album</h1>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#123528' }}>{label}</label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #E7EAE5', borderRadius: 16, padding: 24,
};
const sectionHeading: React.CSSProperties = {
  fontSize: 14, fontWeight: 800, color: '#0F3D2E', marginBottom: 14,
};
const fieldset: React.CSSProperties = {
  border: '1px solid #EDEFEC', borderRadius: 12, padding: 16,
  display: 'flex', flexDirection: 'column', gap: 14,
};
const legendStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#8b968f', textTransform: 'uppercase', letterSpacing: 1, padding: '0 6px',
};
const inputStyle: React.CSSProperties = {
  height: 38, borderRadius: 9, border: '1px solid #D8E0DC', padding: '0 12px', fontSize: 13.5, width: '100%',
};
const primaryBtn: React.CSSProperties = {
  height: 38, borderRadius: 9, background: '#0F3D2E', color: '#fff', border: 'none',
  fontWeight: 700, cursor: 'pointer', padding: '0 20px', fontSize: 12.5,
};
const ghostBtn: React.CSSProperties = {
  height: 38, borderRadius: 9, background: '#fff', color: '#123528', border: '1px solid #D8E0DC',
  fontWeight: 700, cursor: 'pointer', padding: '0 18px', fontSize: 12.5,
};
const pageRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
  background: '#FAFBF9', border: '1px solid #EDEFEC', borderRadius: 12,
};
function iconBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 30, height: 30, borderRadius: 8, background: '#fff', border: '1px solid #D8E0DC',
    color: disabled ? '#c7cec9' : '#5b6660', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13,
  };
}
