import type { Metadata } from 'next';
import Film from '@/components/Film';
import Shot from '@/components/Shot';
import SiteFooter from '@/components/SiteFooter';
import SiteNav from '@/components/SiteNav';

export const metadata: Metadata = {
  title: 'Eventor Studio Manager - album design and retouching for photographers',
  description:
    'A desktop app for Windows and macOS that designs wedding albums, retouches photos and makes thank you cards, ready for print or for your client to flip through.',
};

const SECTIONS: [string, string][] = [
  ['#albums', 'Albums'], ['#retouch', 'Retouch'], ['#cards', 'Cards'], ['#print', 'Print'], ['#faq', 'Questions'],
];

const TICKER = [
  'Auto Build', 'Shuffle a page', 'Faces kept in frame', 'Magic skin', 'Lip colour on chosen faces',
  'Spot healing', 'Colour grading', 'Thank you cards', 'Cover designer', 'Live DPI check',
  '300 DPI JPG and PDF', 'Publish to your client', 'Works offline', 'Windows and macOS',
];

const FAQ = [
  {
    q: 'Which computers does it run on?',
    a: 'Windows and macOS. Install it on as many computers as your Eventor plan allows, and move it from one to another by removing the old one in the app.',
  },
  {
    q: 'Do I need an internet connection?',
    a: 'Only to sign in and to publish. After that it works offline for seven days at a time, so you can design on the road or at a venue.',
  },
  {
    q: 'Are my original photos changed?',
    a: 'Never. Retouching and colour are saved with the album and in new copies, and the files from your camera stay exactly as they were.',
  },
  {
    q: 'How do I get new layouts and features?',
    a: 'The app tells you when a new version is ready and updates itself with one click, with no reinstall. New layouts, text designs and tools arrive the same way.',
  },
  {
    q: 'Does it work with Eventor CRM?',
    a: 'Yes. Your client chooses their photos in the client portal, you design the album from that selection, and you publish the finished album back to them as a flip-through album with its cover and music.',
  },
  {
    q: 'What do I send to the print lab?',
    a: 'Print-ready JPG files and one PDF at the resolution your lab asks for, with bleed. Before exporting, the app checks for low-resolution photos, empty frames and photos used twice.',
  },
];

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="sm-ticks">
      {items.map((i) => <li key={i}>{i}</li>)}
    </ul>
  );
}

function Window({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <figure className="sm-window">
      <figcaption className="sm-window-bar"><span /><span /><span />{title}</figcaption>
      {children}
    </figure>
  );
}

export default function StudioManagerPage() {
  return (
    <div className="sm">
      <SiteNav current="studio-manager" links={SECTIONS} dark />

      {/* ── HERO ── */}
      <header className="sm-hero">
        <div className="sm-hero-copy">
          <span className="sm-eyebrow">Eventor Studio Manager · Windows and macOS</span>
          <h1>Wedding albums, designed in an <em>afternoon</em>.</h1>
          <p>
            Lay out a whole album from a folder of photos, retouch faces, make the thank you cards,
            and send it all to print or to your client. One app, made for Sri Lankan studios.
          </p>
          <div className="sm-actions">
            <a href="/get-started" className="sm-primary cta-beat">Get started</a>
            <Film src="/studio/studio-manager-film.mp4" poster="/studio/studio-manager-film-poster.webp" label="Watch it work" className="sm-secondary" />
          </div>
          <p className="sm-small">Part of your Eventor plan · Works offline · New features arrive as free updates</p>
        </div>
        <div className="sm-hero-shot">
          <Window title="Sajini & Achala · 12 spreads">
            <Shot name="spread-1" alt="Eventor Studio Manager showing a wedding album spread, with the spread list along the bottom" eager />
          </Window>
        </div>
      </header>

      {/* ── TICKER ── */}
      <div className="marquee sm-ticker" aria-label="What it does">
        <div className="marquee-track">
          {[0, 1].map((run) => (
            <div key={run} aria-hidden={run === 1} className="sm-ticker-run">
              {TICKER.map((t) => <span key={t}>{t}</span>)}
            </div>
          ))}
        </div>
      </div>

      {/* ── AUTO BUILD ── */}
      <section id="albums" className="sm-section">
        <div className="sm-split">
          <div>
            <span className="sm-kicker">Auto Build</span>
            <h2>A first draft of the whole album, in one click.</h2>
            <p>
              Choose the photos and the style. Auto Build puts them in the order they were taken,
              starts a new spread when the day moves on, and lays every spread out from hundreds of
              original layouts. No page is left blank.
            </p>
            <Ticks items={[
              'Keeps the story in order, from getting ready to the last dance',
              'Sets aside blurry and repeated shots for you to check',
              'Styles from full and busy to fine art with open paper',
              'Starts from your client\'s own selection in Eventor',
            ]} />
          </div>
          <Window title="Lead and small stack beside a full page">
            <Shot name="spread-3" alt="A spread with one large photo on the right page and a small stack on the left" />
          </Window>
        </div>
      </section>

      {/* ── SHUFFLE ── */}
      <section className="sm-section sm-tint">
        <div className="sm-split sm-flip">
          <div>
            <span className="sm-kicker">Shuffle</span>
            <h2>Not quite right? Shuffle it.</h2>
            <p>
              Every click tries another layout for the same photos and crops them around the faces,
              so nobody loses the top of their head. Happy with one page? Shuffle just the other.
            </p>
            <div className="sm-chips" aria-hidden>
              <span>L</span><span className="on">Both</span><span>R</span>
            </div>
            <Ticks items={[
              'Shuffle the left page, the right page or both',
              'Crops follow the faces in each photo',
              'Mirror a spread, or move anything by hand in the designer',
              'Undo any step',
            ]} />
          </div>
          <Window title="Full page with a tall and a square">
            <Shot name="spread-4" alt="A spread with a dancing bride on the left page and two photos on the right" />
          </Window>
        </div>
      </section>

      {/* ── RETOUCH ── */}
      <section id="retouch" className="sm-section">
        <div className="sm-center">
          <span className="sm-kicker">Magic Retouch</span>
          <h2>Retouching that keeps the person.</h2>
          <p>
            Magic skin smooths, brightens and evens every face at once. Eyes, brows and lips stay
            sharp, and each person keeps their own skin colour. Drag the line to compare.
          </p>
        </div>
        <Window title="Magic Retouch">
          <Shot name="retouch" alt="Magic Retouch with a before and after line across a portrait, and the Magic skin sliders" />
        </Window>
        <div className="sm-grid">
          {[
            ['Magic skin', 'Smooth, brighten and even tone, with the texture kept up to half strength.'],
            ['Makeup', 'Lip colour, blush, contour and highlight, only on the faces you choose.'],
            ['Healing and clone', 'Spots, stray hairs and marks gone with a brush.'],
            ['Colour', 'Auto colour, tone, a colour mixer, grading wheels and a white balance picker.'],
          ].map(([title, text]) => (
            <div key={title} className="sm-card"><h3>{title}</h3><p>{text}</p></div>
          ))}
        </div>
      </section>

      {/* ── CARDS ── */}
      <section id="cards" className="sm-section sm-tint">
        <div className="sm-split">
          <div>
            <span className="sm-kicker">Thank you cards</span>
            <h2>The thank you cards, from the same photos.</h2>
            <p>
              Pick a few photos and Eventor offers a card in every design that suits them, with the
              couple&rsquo;s names and date already in place. Change the words, then export for print.
            </p>
            <Ticks items={[
              'A design for every number of photos',
              'Names and dates filled in for you',
              'Print-ready at 300 DPI',
            ]} />
          </div>
          <div className="sm-video">
            <video src="/studio/thank-you-cards-loop.mp4" poster="/studio/thank-you-cards-loop-poster.webp" autoPlay muted loop playsInline preload="none" aria-label="Making a thank you card in Eventor Studio Manager" />
          </div>
        </div>
      </section>

      {/* ── PRINT AND PUBLISH ── */}
      <section id="print" className="sm-section">
        <div className="sm-split sm-flip">
          <div>
            <span className="sm-kicker">Print and publish</span>
            <h2>Ready for the lab. Ready for the client.</h2>
            <p>
              Every photo shows its print resolution as you work, so a soft photo is caught before
              it is printed. When the album is done, export it for the lab or send it to your client
              as an album they can flip through, with its cover and music.
            </p>
            <div className="sm-stats">
              <div><strong>DPI</strong><span>shown live on every photo</span></div>
              <div><strong>JPG + PDF</strong><span>print-ready, with bleed</span></div>
              <div><strong>Covers</strong><span>linen, leather, fabric or velvet</span></div>
              <div><strong>1 click</strong><span>to publish to your client</span></div>
            </div>
          </div>
          <Window title="Custom layout">
            <Shot name="spread-5" alt="A spread of three photos across both pages, with the print resolution shown on each" />
          </Window>
        </div>
      </section>

      {/* ── MADE FOR PHOTOGRAPHERS ── */}
      <section className="sm-section sm-maker">
        <div className="sm-maker-row">
          <img
            src="/studio/photographer-1000.webp"
            srcSet="/studio/photographer-600.webp 600w, /studio/photographer-1000.webp 1000w"
            sizes="(max-width: 900px) 80vw, 420px"
            alt="A photographer in his studio, holding a camera"
            width={1000}
            height={1500}
            loading="lazy"
          />
          <div>
            <span className="sm-kicker">Made for photographers</span>
            <h2>Spend the evening with the photos, not the software.</h2>
            <p>
              Studio Manager does the slow parts — the first layout, the skin, the cards, the checks
              before print — so the hours go into the choices only you can make.
            </p>
            <p>
              It is built with studios in Sri Lanka, and it keeps getting better: when a new version
              is ready, the app offers it and updates itself, with new layouts, text designs and
              tools included.
            </p>
            <div className="sm-actions">
              <a href="/get-started" className="sm-primary">Get started</a>
              <a href="/crm" className="sm-secondary">See Eventor CRM</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="sm-section sm-tint">
        <div className="sm-faq">
          <h2>Questions</h2>
          {FAQ.map((f) => (
            <details key={f.q} className="faq sm-faq-item">
              <summary>
                {f.q}
                <span className="faq-mark" aria-hidden><span className="bar" /><span className="bar v" /></span>
              </summary>
              <p className="faq-answer">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CLOSING ── */}
      <section className="sm-section">
        <div className="sm-closing">
          <h2>Your next album could be finished tonight.</h2>
          <p>Sign up for Eventor, choose the plan with Studio Manager, and install it on your computer.</p>
          <div className="sm-actions">
            <a href="/get-started" className="sm-light">Get started</a>
            <Film src="/studio/studio-manager-film.mp4" poster="/studio/studio-manager-film-poster.webp" label="Watch it work" className="sm-ghost" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
