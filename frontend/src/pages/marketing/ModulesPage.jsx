import { Link } from 'react-router-dom';
import { PAGE_SEO } from '../../constants/marketingSeo';
import { MARKETING_MODULES } from '../../constants/marketingContent';
import MarketingLayout, { MarketingPageHero, MarketingCtaBand } from '../../components/marketing/MarketingLayout';
import MarketingReveal from '../../components/marketing/MarketingReveal';

export default function ModulesPage() {
  return (
    <MarketingLayout seo={PAGE_SEO.modules}>
      <MarketingPageHero
        kicker="Workspace map"
        title="Seven modules. One shared lead record."
        subtitle="Calls, notes, follow-ups, and reports all point at the same customer — so the floor stays aligned."
      />

      <div className="mkt-shell">
        <div className="mkt-module-grid">
          {MARKETING_MODULES.map((m, i) => (
            <MarketingReveal
              key={m.id}
              as="article"
              className="mkt-module-card"
              id={m.id}
              delay={(i % 3) * 70}
              style={{ '--stagger': `${(i % 3) * 40}ms` }}
            >
              <div className="mkt-module-card__top">
                <span className="mkt-module-card__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="mkt-module-card__tag">{m.tag}</span>
              </div>
              <h2>{m.name}</h2>
              <p className="mkt-module-card__summary">{m.summary}</p>
              <p className="mkt-module-card__who">
                Best for <strong>{m.forWho}</strong>
              </p>
              <ul>
                {m.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </MarketingReveal>
          ))}
        </div>
      </div>

      <MarketingReveal as="section" className="mkt-section mkt-section--inset" delay={80}>
        <div className="mkt-shell">
          <div className="mkt-inline-links">
            <Link to="/features">Feature details →</Link>
            <Link to="/faq">Setup FAQ →</Link>
          </div>
        </div>
      </MarketingReveal>

      <MarketingCtaBand
        title="Open the desk that matches your role"
        text="Managers start at Command Center. Closers live in Lead Vault and Follow-up Radar."
        primaryLabel="Create workspace"
      />
    </MarketingLayout>
  );
}
