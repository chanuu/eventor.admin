// ─── Enums ───────────────────────────────────────────────────────────────────

export type SubscriptionPlan = 'basic' | 'pro';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled';
export type StaffRole = 'admin' | 'editor' | 'sales' | 'coordinator';
export type JobStatus =
  | 'lead'
  | 'quoted'
  | 'contracted'
  | 'active'
  | 'editing'
  | 'proofing'
  | 'delivered'
  | 'archived';
export type ShootStatus = 'scheduled' | 'shot' | 'editing' | 'done';
export type GalleryMode = 'combined' | 'separate';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'void';
export type PaymentType = 'advance' | 'balance' | 'addon' | 'refund';
export type PaymentMethod = 'cash' | 'bank' | 'payhere' | 'cheque';
export type PaymentStatus = 'pending' | 'paid';
export type GalleryStatus = 'hidden' | 'proofing' | 'approved';
export type NotificationRecipientType = 'staff' | 'client';
export type NotificationChannel = 'email' | 'sms';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface Studio {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  phone: string | null;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

export interface Subscription {
  id: string;
  studio_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  studio_id: string;
  user_id: string;
  role: StaffRole;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  studio_id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Package {
  id: string;
  studio_id: string;
  name: string;
  description: string | null;
  base_price: number;
  shoots_included: number;
  is_active: boolean;
  created_at: string;
}

export interface PackageAddon {
  id: string;
  studio_id: string;
  package_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  studio_id: string;
  client_id: string;
  package_id: string | null;
  title: string;
  event_type: string | null;
  status: JobStatus;
  total_price: number;
  notes: string | null;
  created_at: string;
}

export interface JobAddon {
  id: string;
  studio_id: string;
  job_id: string;
  addon_id: string;
  price_at_booking: number;
  quantity: number;
  created_at: string;
}

export interface Shoot {
  id: string;
  job_id: string;
  studio_id: string;
  shoot_type: string | null;
  scheduled_at: string | null;
  venue: string | null;
  status: ShootStatus;
  gallery_mode: GalleryMode;
  notes: string | null;
  created_at: string;
}

export interface ShootStaff {
  id: string;
  studio_id: string;
  shoot_id: string;
  staff_id: string;
  role_in_shoot: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  job_id: string;
  studio_id: string;
  content_html: string | null;
  signed_at: string | null;
  signature_data: string | null;
  status: ContractStatus;
  created_at: string;
}

export interface Payment {
  id: string;
  job_id: string;
  studio_id: string;
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Gallery {
  id: string;
  shoot_id: string | null;
  job_id: string;
  title: string;
  status: GalleryStatus;
  selection_deadline: string | null;
  created_at: string;
}

export interface GalleryPhoto {
  id: string;
  studio_id: string;
  gallery_id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
  is_active: boolean;
  is_selected: boolean;
  selected_at: string | null;
  created_at: string;
}

export interface Flipbook {
  id: string;
  job_id: string;
  studio_id: string;
  storage_path: string | null;
  share_token: string;
  published_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  studio_id: string;
  job_id: string | null;
  recipient_type: NotificationRecipientType;
  channel: NotificationChannel;
  subject: string | null;
  body: string | null;
  sent_at: string | null;
  created_at: string;
}

// ─── Supabase Database type ───────────────────────────────────────────────────
// Supabase JS v2 requires Row/Insert/Update/Relationships on every table.
// Without Relationships the generic constraints resolve to `never`.

type TableDef<T> = {
  Row: T;
  Insert: Omit<T, 'id' | 'created_at'> & { id?: string; created_at?: string };
  Update: Partial<Omit<T, 'id'>>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      studios: TableDef<Studio>;
      subscriptions: TableDef<Subscription>;
      staff: TableDef<Staff>;
      clients: TableDef<Client>;
      packages: TableDef<Package>;
      package_addons: TableDef<PackageAddon>;
      jobs: TableDef<Job>;
      job_addons: TableDef<JobAddon>;
      shoots: TableDef<Shoot>;
      shoot_staff: TableDef<ShootStaff>;
      contracts: TableDef<Contract>;
      payments: TableDef<Payment>;
      galleries: TableDef<Gallery>;
      gallery_photos: TableDef<GalleryPhoto>;
      flipbooks: TableDef<Flipbook>;
      notifications: TableDef<Notification>;
    };
    Enums: {
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
      staff_role: StaffRole;
      job_status: JobStatus;
      shoot_status: ShootStatus;
      gallery_mode: GalleryMode;
      contract_status: ContractStatus;
      payment_type: PaymentType;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      gallery_status: GalleryStatus;
      notification_recipient_type: NotificationRecipientType;
      notification_channel: NotificationChannel;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
