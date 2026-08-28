import { createContext, useContext } from 'react';
import { supabase } from './supabase';
import { isUrl } from './format';

const STORAGE_BUCKET = 'gallery-photos';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Studio = { id: string; name: string; logo_url: string | null };
export type Pkg = { id: string; name: string; description: string | null; base_price: number; shoots_included: number };
export type Addon = { id: string; name: string; description: string | null; price: number };
export type JobAddon = { id: string; quantity: number; price_at_booking: number; name: string };
export type Shoot = {
  id: string; shoot_type: string | null; scheduled_at: string | null;
  venue: string | null; status: string; notes: string | null; crew: string[];
};
export type Payment = {
  id: string; type: string; amount: number; method: string;
  status: string; paid_at: string | null; notes: string | null; created_at: string;
};
export type Photo = {
  id: string; storage_path: string; file_name: string;
  is_selected: boolean; sort_order: number; caption: string | null;
};
export type Gallery = {
  id: string; title: string; status: string; shoot_id: string | null;
  selection_deadline: string | null; selection_submitted_at: string | null;
  created_at: string; photos: Photo[];
};
export type Contract = {
  id: string; status: string; content_html: string | null;
  signed_at: string | null; signature_data: string | null; created_at: string;
};
/** The printable album: a PDF the studio uploads and publishes for the client. */
export type Flipbook = {
  id: string; storage_path: string | null; share_token: string;
  published_at: string | null; created_at: string;
};

/** The flip-through digital album the studio builds page by page in admin. */
export type AlbumPageRow = {
  id: string; image_url: string | null; caption: string | null; sort_order: number;
  gallery_photos: { storage_path: string } | null;
};
export type Album = {
  id: string; title: string | null;
  cover_kicker: string | null; cover_title: string | null; cover_body: string | null;
  closing_kicker: string | null; closing_title: string | null; closing_body: string | null;
  music_enabled: boolean; music_url: string | null; music_name: string | null;
  autoplay: boolean; autoplay_seconds: number;
  share_token: string | null; is_public: boolean;
  published_at: string | null;
  pages: AlbumPageRow[];
};

export type PortalJob = {
  id: string; title: string; event_type: string | null; status: string;
  total_price: number; notes: string | null; created_at: string;
  clientName: string; studio: Studio | null; pkg: Pkg | null;
  jobAddons: JobAddon[]; availableAddons: Addon[];
  shoots: Shoot[]; payments: Payment[]; galleries: Gallery[];
  contract: Contract | null; flipbook: Flipbook | null; album: Album | null;
};

export type PortalData = {
  job: PortalJob;
  /** All jobs belonging to this client, for the sidebar switcher. */
  jobOptions: { id: string; title: string }[];
  reload: () => void;
};

// ─── Derived values shared across screens ────────────────────────────────────

export function photoUrl(storagePath: string): string {
  if (isUrl(storagePath)) return storagePath;
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export function totalPaid(payments: Payment[]): number {
  return payments.filter((p) => p.status === 'paid' && p.type !== 'refund').reduce((s, p) => s + Number(p.amount), 0);
}

export function balanceDue(job: PortalJob): number {
  return Number(job.total_price) - totalPaid(job.payments);
}

/** Soonest shoot that has not happened yet; falls back to the last one. */
export function nextShoot(shoots: Shoot[]): Shoot | null {
  const scheduled = shoots.filter((s) => s.scheduled_at);
  const upcoming = scheduled.find((s) => new Date(s.scheduled_at!).getTime() >= Date.now());
  return upcoming ?? scheduled[scheduled.length - 1] ?? shoots[0] ?? null;
}

/** The main event date — the latest scheduled shoot, which is the event day itself. */
export function eventDate(shoots: Shoot[]): string | null {
  const dated = shoots.filter((s) => s.scheduled_at).map((s) => s.scheduled_at!);
  return dated.length ? dated[dated.length - 1] : null;
}

export function galleriesVisible(job: PortalJob): Gallery[] {
  return job.galleries.filter((g) => g.status !== 'hidden');
}

export function proofingGalleries(job: PortalJob): Gallery[] {
  return job.galleries.filter((g) => g.status === 'proofing');
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

/** Every job the signed-in client can see, newest first. RLS scopes this to them. */
export async function fetchJobOptions(): Promise<{ id: string; title: string }[]> {
  const { data } = await supabase
    .from('jobs')
    .select('id, title, created_at')
    .order('created_at', { ascending: false });
  return ((data ?? []) as { id: string; title: string }[]).map(({ id, title }) => ({ id, title }));
}

export async function fetchPortalJob(jobId: string): Promise<PortalJob | null> {
  const { data: raw, error } = await supabase
    .from('jobs')
    .select(`
      id, title, event_type, status, total_price, notes, created_at,
      clients(full_name),
      studios(id, name, logo_url),
      packages(id, name, description, base_price, shoots_included,
               package_addons(id, name, description, price, is_active)),
      job_addons(id, quantity, price_at_booking, package_addons(name)),
      shoots(id, shoot_type, scheduled_at, venue, status, notes,
             shoot_staff(staff(full_name))),
      payments(id, type, amount, method, status, paid_at, notes, created_at),
      galleries(id, title, status, shoot_id, selection_deadline, selection_submitted_at, created_at,
                gallery_photos(id, storage_path, file_name, is_selected, sort_order, caption, is_active)),
      contracts(id, status, content_html, signed_at, signature_data, created_at),
      flipbooks(id, storage_path, share_token, published_at, created_at),
      albums(id, title, cover_kicker, cover_title, cover_body,
             closing_kicker, closing_title, closing_body,
             music_enabled, music_url, music_name,
             autoplay, autoplay_seconds, share_token, is_public, published_at,
             album_pages(id, image_url, caption, sort_order, gallery_photos(storage_path)))
    `)
    .eq('id', jobId)
    .maybeSingle();

  if (error || !raw) return null;
  const r = raw as any;

  const pkg = r.packages
    ? {
        id: r.packages.id, name: r.packages.name, description: r.packages.description,
        base_price: Number(r.packages.base_price), shoots_included: r.packages.shoots_included,
      }
    : null;

  const shoots: Shoot[] = ((r.shoots ?? []) as any[])
    .map((s) => ({
      id: s.id, shoot_type: s.shoot_type, scheduled_at: s.scheduled_at,
      venue: s.venue, status: s.status, notes: s.notes,
      crew: ((s.shoot_staff ?? []) as any[]).map((ss) => ss.staff?.full_name).filter(Boolean) as string[],
    }))
    .sort((a, b) => {
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;
      return a.scheduled_at.localeCompare(b.scheduled_at);
    });

  const galleries: Gallery[] = ((r.galleries ?? []) as any[])
    .map((g) => ({
      id: g.id, title: g.title, status: g.status, shoot_id: g.shoot_id,
      selection_deadline: g.selection_deadline,
      selection_submitted_at: g.selection_submitted_at ?? null,
      created_at: g.created_at,
      photos: ((g.gallery_photos ?? []) as any[])
        .filter((p) => p.is_active)
        .map((p) => ({
          id: p.id, storage_path: p.storage_path, file_name: p.file_name,
          is_selected: p.is_selected, sort_order: p.sort_order, caption: p.caption ?? null,
        }))
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    id: r.id, title: r.title, event_type: r.event_type, status: r.status,
    total_price: Number(r.total_price), notes: r.notes, created_at: r.created_at,
    clientName: r.clients?.full_name ?? 'Client',
    studio: r.studios ? { id: r.studios.id, name: r.studios.name, logo_url: r.studios.logo_url } : null,
    pkg,
    jobAddons: ((r.job_addons ?? []) as any[]).map((ja) => ({
      id: ja.id, quantity: ja.quantity, price_at_booking: Number(ja.price_at_booking),
      name: ja.package_addons?.name ?? 'Add-on',
    })),
    availableAddons: ((r.packages?.package_addons ?? []) as any[])
      .filter((a) => a.is_active)
      .map((a) => ({ id: a.id, name: a.name, description: a.description, price: Number(a.price) })),
    shoots,
    payments: ((r.payments ?? []) as any[])
      .map((p) => ({ ...p, amount: Number(p.amount) }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    galleries,
    contract: one<Contract>(r.contracts),
    flipbook: one<Flipbook>(r.flipbooks),
    album: albumFrom(r.albums),
  };
}

/** Normalises a to-one embed, which PostgREST may return as object or array. */
function one<T>(raw: any): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? raw[0] : raw) ?? null;
}

function albumFrom(raw: any): Album | null {
  const a = one<any>(raw);
  if (!a) return null;
  return {
    id: a.id, title: a.title,
    cover_kicker: a.cover_kicker, cover_title: a.cover_title, cover_body: a.cover_body,
    closing_kicker: a.closing_kicker, closing_title: a.closing_title, closing_body: a.closing_body,
    music_enabled: a.music_enabled ?? true,
    music_url: a.music_url ?? null,
    music_name: a.music_name ?? null,
    autoplay: a.autoplay ?? false,
    autoplay_seconds: a.autoplay_seconds ?? 6,
    share_token: a.share_token ?? null,
    is_public: a.is_public ?? false,
    published_at: a.published_at,
    pages: ((a.album_pages ?? []) as AlbumPageRow[])
      .slice()
      .sort((x, y) => x.sort_order - y.sort_order),
  };
}

/** Resolves a built album page to a displayable image URL. */
export function albumPageUrl(page: AlbumPageRow): string | null {
  if (page.image_url) return page.image_url;
  const path = page.gallery_photos?.storage_path;
  return path ? photoUrl(path) : null;
}

/**
 * Pages for the digital album, in order.
 *
 * Preference is the photos the client picked during proofing — that selection is
 * literally "what goes in the album". If nothing has been selected yet, fall back
 * to the newest gallery that has photos so the album is never empty for a client
 * whose studio hasn't run proofing.
 */
export function albumPhotos(job: PortalJob): Photo[] {
  const visible = galleriesVisible(job);

  const selected = visible
    .flatMap((g) => g.photos.filter((p) => p.is_selected))
    .sort((a, b) => a.sort_order - b.sort_order);
  if (selected.length) return selected;

  const newestWithPhotos = visible.find((g) => g.photos.length > 0);
  return newestWithPhotos ? newestWithPhotos.photos : [];
}

/** Public share page for a published album, served by the admin app. */
export function albumShareUrl(flipbook: Flipbook): string | null {
  if (!flipbook.published_at || !flipbook.storage_path) return null;
  const base = (import.meta.env.VITE_ADMIN_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  return `${base}/flipbook/${flipbook.share_token}`;
}

/**
 * The album PDF itself. S3-hosted albums are embedded straight from their public
 * URL; legacy Supabase-hosted ones fall back to the studio's share page, which
 * signs the storage URL server-side.
 */
export function albumFileUrl(flipbook: Flipbook): string | null {
  if (!flipbook.published_at || !flipbook.storage_path) return null;
  if (isUrl(flipbook.storage_path)) return flipbook.storage_path;
  return albumShareUrl(flipbook);
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const PortalContext = createContext<PortalData | null>(null);

export function usePortal(): PortalData {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside the portal layout');
  return ctx;
}
