import { Link } from 'react-router-dom';
import { PAGE_SEO } from '../../constants/marketingSeo';
import { MARKETING_FEATURES, FEATURE_CATEGORIES } from '../../constants/marketingContent';
import MarketingLayout, { MarketingPageHero, MarketingCtaBand } from '../../components/marketing/MarketingLayout';
import MarketingReveal from '../../components/marketing/MarketingReveal';

export default function FeaturesPage() {
  return (
    <MarketingLayout seo={PAGE_SEO.features}>
      <MarketingPageHero
        kicker="Product depth"
        title="CRM features built for leads, IVR calls, and follow-up discipline"
        subtitle="A focused toolkit — pipeline, calling, tasks, reports, and team controls — so the floor works from one desk."
      />

      <div className="mkt-shell mkt-features-stack">
        {FEATURE_CATEGORIES.map((cat, catIdx) => {
          const items = MARKETING_FEATURES.filter((f) => f.category === cat);
          if (!items.length) return null;
          return (
            <MarketingReveal
              key={cat}
              as="section"
              className="mkt-features-block"
              delay={catIdx * 60}
            >
              <header className="mkt-features-block__head">
                <h2>{cat}</h2>
              </header>
              <div className="mkt-feature-detail-grid">
                {items.map((f, i) => (
                  <article
                    key={f.slug}
                    id={f.slug}
                    className="mkt-feature-detail"
                    style={{ '--stagger': `${i * 40}ms` }}
                  >
                    <h3>{f.title}</h3>
                    <p className="mkt-feature-detail__lead">{f.desc}</p>
                    <p className="mkt-feature-detail__body">{f.detail}</p>
                  </article>
                ))}
              </div>
            </MarketingReveal>
          );
        })}
      </div>

      <MarketingReveal as="section" className="mkt-section mkt-section--inset" delay={100}>
        <div className="mkt-shell">
          <div className="mkt-inline-links">
            <Link to="/modules">See modules →</Link>
            <Link to="/pricing">View pricing →</Link>
          </div>
        </div>
      </MarketingReveal>

      <MarketingCtaBand
        title="Try the desk on your next campaign week"
        text="Create a workspace, invite two reps, and run one campaign week on the real product."
        primaryLabel="Start free trial"
      />
    </MarketingLayout>
  );
}
