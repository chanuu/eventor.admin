import PromoVideo from '@/components/PromoVideo';
import SiteFooter from '@/components/SiteFooter';
import SiteNav from '@/components/SiteNav';

/**
 * The front door: Eventor is two products, so a studio first chooses the one it came for.
 */
export default function HomePage() {
  return (
    <div className="home">
      <SiteNav />

      <header className="home-hero">
        <span className="home-eyebrow">Photography studio platform · Sri Lanka</span>
        <h1>Everything your studio runs on.</h1>
        <p>
          Two tools that work together: one on your computer to design and retouch, one online to
          run the business and look after your clients.
        </p>
      </header>

      {/* The main promo: the first thing to see, and the first thing to press. */}
      <section className="home-promo" aria-label="The Eventor film">
        <PromoVideo src="/studio/eventor-film.mp4" thumb="/studio/eventor-film-thumb" title="Meet Eventor" length="1:17" />
      </section>

      <section className="home-products" aria-label="Products">
        <a href="/studio-manager" className="home-product dark">
          <div className="home-product-copy">
            <span className="home-tag">Desktop app · Windows and macOS</span>
            <h2>Eventor Studio Manager</h2>
            <p>Design wedding albums, retouch faces, make thank you cards and export them for print.</p>
            <ul>
              <li>Auto Build and Shuffle</li>
              <li>Magic Retouch and makeup</li>
              <li>Print-ready JPG and PDF</li>
            </ul>
            <span className="home-go">Explore Studio Manager →</span>
          </div>
          <img
            src="/studio/spread-2-1600.webp"
            srcSet="/studio/spread-2-960.webp 960w, /studio/spread-2-1600.webp 1600w"
            sizes="(max-width: 900px) 100vw, 50vw"
            alt="An album spread in Eventor Studio Manager"
            width={1600}
            height={817}
          />
        </a>

        <a href="/crm" className="home-product light">
          <div className="home-product-copy">
            <span className="home-tag">Online · any browser</span>
            <h2>Eventor CRM</h2>
            <p>Bookings, agreements, proofing galleries, payments and the crew calendar in one place.</p>
            <ul>
              <li>Leads to signed bookings</li>
              <li>Clients choose their photos</li>
              <li>Deposits and balances tracked</li>
            </ul>
            <span className="home-go">Explore CRM →</span>
          </div>
          <img src="/assets/features/dashboard.png" alt="The Eventor CRM dashboard" width={1600} height={1000} loading="lazy" />
        </a>
      </section>

      <section className="home-together">
        <div className="home-together-copy">
          <h2>Better together</h2>
          <p>Each works on its own. Used together, an album goes from the shoot to your client without a single file sent by hand.</p>
        </div>
        <ol className="home-steps">
          <li><strong>Your client chooses</strong><span>They pick their favourite photos in the client portal.</span><em>CRM</em></li>
          <li><strong>You design</strong><span>Studio Manager builds the album from their selection.</span><em>Studio Manager</em></li>
          <li><strong>They flip through it</strong><span>Publish it back as an album with its cover and music.</span><em>CRM</em></li>
        </ol>
      </section>

      <SiteFooter />
    </div>
  );
}
