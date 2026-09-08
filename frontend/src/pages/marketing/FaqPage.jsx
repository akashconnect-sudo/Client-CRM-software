import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PAGE_SEO } from '../../constants/marketingSeo';
import { MARKETING_FAQ } from '../../constants/marketingContent';
import MarketingLayout, { MarketingPageHero, MarketingCtaBand } from '../../components/marketing/MarketingLayout';
import MarketingReveal from '../../components/marketing/MarketingReveal';

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: MARKETING_FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
};

export default function FaqPage() {
  const [open, setOpen] = useState(0);

  return (
    <MarketingLayout seo={PAGE_SEO.faq} jsonLd={faqJsonLd}>
      <MarketingPageHero
        kicker="Support"
        title="Straight answers before you switch"
        subtitle="Trial, billing, IVR, webhooks, and day-to-day use — in plain language."
      />

      <MarketingReveal className="mkt-shell mkt-shell--readable">
        <div className="mkt-faq-list">
          {MARKETING_FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <article
                key={item.q}
                className={`mkt-faq-item ${isOpen ? 'is-open' : ''}`}
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  itemProp="name"
                >
                  <span>{item.q}</span>
                  <span className="mkt-faq-item__icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                <div
                  className="mkt-faq-item__panel"
                  hidden={!isOpen}
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <p itemProp="text">{item.a}</p>
                </div>
              </article>
            );
          })}
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-section--inset" delay={80}>
        <div className="mkt-shell">
          <div className="mkt-inline-links">
            <Link to="/features">Features →</Link>
            <Link to="/pricing">Pricing →</Link>
            <Link to="/login">Login →</Link>
          </div>
        </div>
      </MarketingReveal>

      <MarketingCtaBand
        title="Still deciding? Try it with real leads"
        text="Spin up a workspace, connect one webhook, and invite two reps before the whole floor moves."
        primaryLabel="Start free trial"
      />
    </MarketingLayout>
  );
}
