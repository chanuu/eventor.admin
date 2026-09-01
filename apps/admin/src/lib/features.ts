/**
 * Plan entitlements, mirroring the `features` catalogue table.
 *
 * Distinct from Capability: a capability answers "does this person's role allow
 * it", a feature answers "has the studio's plan bought it". Both must hold.
 */
export type Feature =
  | 'clients'
  | 'jobs'
  | 'album'
  | 'gallery'
  | 'proofing'
  | 'contracts'
  | 'payments'
  | 'scheduling'
  | 'staff';

export const FEATURE_LABEL: Record<Feature, string> = {
  clients: 'Clients',
  jobs: 'Jobs & events',
  album: 'Digital album',
  gallery: 'Galleries',
  proofing: 'Photo proofing',
  contracts: 'Agreements',
  payments: 'Payments',
  scheduling: 'Crew scheduling',
  staff: 'Staff & roles',
};

export type PlanRow = {
  key: string;
  name: string;
  price_lkr: number;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

/** Copy shown when a page is hidden because the plan doesn't include it. */
export const UPGRADE_PROMPT: Record<Feature, string> = {
  clients: 'Client records are not part of your plan.',
  jobs: 'Jobs and events are not part of your plan.',
  album: 'The digital album is not part of your plan.',
  gallery: 'Photo galleries are not part of your plan.',
  proofing: 'Photo proofing is not part of your plan.',
  contracts: 'Agreements are not part of your plan.',
  payments: 'Payment tracking is not part of your plan.',
  scheduling: 'Crew scheduling is not part of your plan.',
  staff: 'Staff and roles are not part of your plan.',
};
