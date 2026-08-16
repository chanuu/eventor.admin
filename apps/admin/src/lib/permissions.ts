/**
 * Capability keys, mirroring the `permissions` catalogue table.
 *
 * Which role holds which capability is configured per studio in the database —
 * this file only names the keys so TypeScript can catch typos.
 */
export type Capability =
  | 'dashboard.view'
  | 'schedule.view'
  | 'jobs.view'
  | 'jobs.write'
  | 'jobs.shoots'
  | 'jobs.payments'
  | 'jobs.contracts'
  | 'gallery.manage'
  | 'album.manage'
  | 'clients.manage'
  | 'packages.manage'
  | 'staff.manage'
  | 'settings.manage';

export type PermissionRow = {
  key: Capability;
  label: string;
  category: string;
  sort_order: number;
};

export type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: Capability[];
};

/** Permission keys the UI must never let a studio strip from every role. */
export const CRITICAL_PERMISSION: Capability = 'staff.manage';
