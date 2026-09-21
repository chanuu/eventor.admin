import { requireFeature } from '@/lib/staff';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Pagination from '@/components/Pagination';
import GalleriesTable, { type GalleryRow } from './GalleriesTable';
import NewGalleryDialog from './NewGalleryDialog';

type Job = { id: string; title: string; studio_id: string };

type Shoot = { id: string; shoot_type: string | null; scheduled_at: string | null };

const GALLERIES_PER_PAGE = 10;

export default async function GalleryListPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string };
}) {
  await requireFeature('gallery');
  const supabase = createClient();

  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('id, title, studio_id')
    .eq('id', params.id)
    .single();

  if (!jobRaw) notFound();
  const job = jobRaw as Job;

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const rangeFrom = (page - 1) * GALLERIES_PER_PAGE;

  const [{ data: galleriesRaw }, { count: galleryTotal }, { data: shootsRaw }] = await Promise.all([
    supabase
      .from('galleries')
      .select('id, title, status, selection_deadline, selection_submitted_at, created_at')
      .eq('job_id', params.id)
      .order('created_at')
      .range(rangeFrom, rangeFrom + GALLERIES_PER_PAGE - 1),
    supabase
      .from('galleries')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', params.id),
    supabase
      .from('shoots')
      .select('id, shoot_type, scheduled_at')
      .eq('job_id', params.id)
      .order('scheduled_at'),
  ]);

  const rows = (galleriesRaw ?? []) as Omit<GalleryRow, 'photoCount'>[];
  const shoots = (shootsRaw ?? []) as Shoot[];
  const pageCount = Math.max(1, Math.ceil((galleryTotal ?? 0) / GALLERIES_PER_PAGE));

  // Count each gallery in the database rather than pulling every photo row for
  // the whole studio and counting in JavaScript. Bounded by the page size, and
  // each one is a covered index lookup on (gallery_id, sort_order).
  const counts = await Promise.all(
    rows.map(async (g) => {
      const { count } = await supabase
        .from('gallery_photos')
        .select('id', { count: 'exact', head: true })
        .eq('gallery_id', g.id)
        .eq('is_active', true);
      return count ?? 0;
    }),
  );

  const galleries: GalleryRow[] = rows.map((g, i) => ({ ...g, photoCount: counts[i] }));

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <Link href={`/jobs/${params.id}`} className="text-sm text-ink-muted">
            ← {job.title}
          </Link>
          <h1 className="page-title mt-2">Galleries</h1>
          <p className="breadcrumb">
            {galleryTotal ?? 0} galler{(galleryTotal ?? 0) !== 1 ? 'ies' : 'y'} on this job
          </p>
        </div>

        <NewGalleryDialog jobId={job.id} studioId={job.studio_id} shoots={shoots} />
      </div>

      <GalleriesTable rows={galleries} jobId={params.id} />

      <Pagination
        page={page}
        totalPages={pageCount}
        pathname={`/jobs/${params.id}/gallery`}
      />
    </div>
  );
}
