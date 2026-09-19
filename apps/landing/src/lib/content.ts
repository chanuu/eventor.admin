/**
 * Landing page content, ported from the Eventor Landing design.
 * Copy, ordering and imagery match the reference exactly.
 */

export const ACCENT = '#0F5344';

export const IMG = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

export const GAL_COVERS = [
  'photo-1519741497674-611481863552',
  'photo-1537633552985-df8429e8048b',
  'photo-1583939003579-730e3918a45a',
];

export const THUMBS = [
  'photo-1465495976277-4387d4b0b4c6', 'photo-1522673607200-164d1b6ce486', 'photo-1470217957101-da7150b9b681',
  'photo-1606216794074-735e91aa2c92', 'photo-1591604466107-ec97de577aff', 'photo-1460978812857-470ed1c77af0',
  'photo-1478146896981-b80fe463b330', 'photo-1509927083803-4bd519298ac4',
];

export type HeroSlide = {
  key: string; label: string; kicker: string;
  titleA: string; titleAccent: string; titleB: string;
  body: string;
  chips?: string[];
  koko?: boolean;
  cta: string; ctaHref: string; alt: string; altHref: string;
  url?: string; image?: string; pos: string; color?: boolean;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    key: 'album', label: 'Virtual album',
    kicker: 'First photography CRM in Sri Lanka',
    titleA: 'Create', titleAccent: 'Modern', titleB: 'Client Virtual Album',
    body: 'One platform for your studio, your clients and your bookings — albums, proofing, agreements, payments and schedules in a single place.',
    cta: 'Subscribe Now', ctaHref: '#pricing', alt: 'See a live album', altHref: '#album',
    url: '/assets/hero-ceremony.jpg', pos: 'center 30%', color: true,
  },
  {
    key: 'features', label: 'Everything included',
    kicker: 'One subscription',
    titleA: 'Everything Your', titleAccent: 'Studio', titleB: 'Runs On',
    body: 'Stop stitching together spreadsheets, chat threads and drives. Eventor covers the whole job from first enquiry to delivered album.',
    chips: ['Studio CRM', 'Photo proofing', 'Virtual album', 'Payments', 'Crew scheduling', 'Cloud storage'],
    cta: 'Explore features', ctaHref: '#crm', alt: 'See pricing', altHref: '#pricing',
    image: 'photo-1519741497674-611481863552', pos: 'center 35%',
  },
  {
    key: 'agreement', label: 'Agreement management',
    kicker: 'Agreement management',
    titleA: 'Send, Sign And', titleAccent: 'Store', titleB: 'Every Agreement',
    body: 'Build the contract once, send it as a link, and let clients read the package, payment terms and cancellation policy before tapping accept. Signed copies stay in their portal.',
    chips: ['Reusable templates', 'Tap-to-sign', 'Sinhala & English', 'Auto PDF copy'],
    cta: 'View an agreement', ctaHref: '#portal', alt: 'See the portal', altHref: '#portal',
    image: 'photo-1450101499163-c8848c66ca85', pos: 'center',
  },
  {
    key: 'koko', label: 'Pay later with Koko',
    kicker: 'Flexible client payments',
    titleA: 'Book Now,', titleAccent: 'Pay Later', titleB: 'With Koko',
    body: 'Let couples split any package into three interest-free instalments at checkout. You get paid up front by Koko — the client pays over time.',
    koko: true,
    cta: 'Enable Koko', ctaHref: '#payments', alt: 'Payment options', altHref: '#payments',
    image: 'photo-1522673607200-164d1b6ce486', pos: 'center 30%',
  },
];

export const NAV_LINKS: [string, string][] = [
  ['#pricing', 'Pricing'], ['#galleries', 'Galleries'], ['#album', 'Virtual Album'],
  ['#crm', 'CRM'], ['#proofing', 'Proofing'], ['#payments', 'Payments'],
];

export const STRIP = [
  { tag: 'CRM', text: 'Leads, events and clients in one pipeline' },
  { tag: 'Virtual album', text: 'Flip-through albums with music' },
  { tag: 'Proofing', text: 'Clients choose their album photos' },
  { tag: 'Payments', text: 'Deposits, balances and receipts' },
  { tag: 'Scheduling', text: 'Crew calendar and day-of timelines' },
];

export const ALBUM_POINTS = [
  'Real page-curl flipbook on desktop, tablet and phone',
  'Background music and full-screen presentation mode',
  'Private link per client — no downloads required',
];

export const GALLERY_DEFS = [
  { couple: 'Hayley & Lito', date: 'July 29th, 2026', dark: false },
  { couple: 'Michael & Evelyn', date: 'July 18th, 2026', dark: false },
  { couple: 'Alex & Sheney', date: 'July 29th, 2026', dark: true },
];

export const CRM_POINTS = [
  { title: 'Lead capture', text: 'Enquiry forms drop straight into the pipeline.' },
  { title: 'Digital agreements', text: 'Send, sign and store contracts online.' },
  { title: 'Event briefs', text: 'Shot lists, venues and crew in one card.' },
  { title: 'Client history', text: 'Every past shoot and payment at a glance.' },
];

export const PIPELINE = [
  { name: 'Randula & Sanduni', meta: 'Wedding · 12 May', stage: 'Signed', bg: '#EAF3E2', fg: '#3f6b2b' },
  { name: 'Dinuka Fernando', meta: 'Corporate · 3 Jun', stage: 'Proposal', bg: '#FDF0E2', fg: '#a8631f' },
  { name: 'Kavindi & Sahan', meta: 'Engagement · 21 Jun', stage: 'Deposit due', bg: '#FDF0E2', fg: '#a8631f' },
  { name: 'Methmi Silva', meta: 'Birthday · 2 Jul', stage: 'Enquiry', bg: '#EDEFEC', fg: '#5b6360' },
  { name: 'Tharindu & Nadee', meta: 'Wedding · 19 Jul', stage: 'Signed', bg: '#EAF3E2', fg: '#3f6b2b' },
];

export const PROOF_POINTS = [
  'Set a required count and a response deadline',
  'Per-photo retouch notes, no more message threads',
  'Approved list flows straight into album design',
];

export const PAYMENT_ROWS = [
  { label: 'Booking deposit (30%)', meta: 'Paid 14 Mar · bank transfer', amount: 'Rs. 45,000', icon: '✓', bg: '#8BC53F', fg: '#0F3D2E', border: 'none' },
  { label: 'Balance payment (70%)', meta: 'Due 5 May · reminder scheduled', amount: 'Rs. 105,000', icon: '!', bg: '#FDF0E2', fg: '#a8631f', border: '2px solid #F3D9BC' },
  { label: 'Album add-on', meta: 'Requested by client', amount: 'Rs. 28,000', icon: '+', bg: '#ffffff', fg: '#8b938f', border: '2px solid #E4E7E5' },
];

export const SCHEDULE_ROWS = [
  { date: '2 Apr', title: 'Pre-shoot session', meta: 'Diyatha Uyana · 4:00 PM', crew: '1 crew', bg: '#EDEFEC', fg: '#5b6360' },
  { date: '12 May', title: 'Wedding day coverage', meta: 'Water’s Edge · 9:00 AM', crew: '3 crew', bg: '#EAF3E2', fg: '#3f6b2b' },
  { date: '18 May', title: 'Editing deadline', meta: 'Gallery cull & retouch', crew: 'Studio', bg: '#EDEFEC', fg: '#5b6360' },
  { date: '3 Jun', title: 'Corporate shoot', meta: 'Cinnamon Grand · 10:00 AM', crew: '2 crew', bg: '#FDF0E2', fg: '#a8631f' },
];

export const PLANS = [
  {
    name: 'Solo', price: 'Rs. 2,900', desc: 'For a single photographer getting organised.',
    features: ['20 active events', 'Client portal & agreements', '50 GB gallery storage', 'Payments & receipts'],
    cta: 'Start free trial', dark: false,
  },
  {
    name: 'Studio', price: 'Rs. 6,900', desc: 'For studios with a crew and a full calendar.',
    features: ['Unlimited events', 'Photo proofing & album builder', '500 GB storage', 'Crew scheduling', 'Branded portal domain'],
    cta: 'Subscribe Now', dark: true,
  },
  {
    name: 'Network', price: 'Rs. 14,900', desc: 'For multi-branch studios and franchises.',
    features: ['Multiple studios & teams', 'Listing on the Eventor directory', '2 TB storage', 'Priority support', 'API access'],
    cta: 'Talk to sales', dark: false,
  },
];

export const FOOTER_COLS = [
  { title: 'Platform', links: ['Studio CRM', 'Virtual album', 'Photo proofing', 'Payments'] },
  { title: 'Company', links: ['About', 'Photographer directory', 'Careers', 'Contact'] },
  { title: 'Support', links: ['Help centre', 'Pricing', 'Terms', 'Privacy'] },
];
