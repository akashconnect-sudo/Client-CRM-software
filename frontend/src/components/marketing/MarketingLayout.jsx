import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MarketingSEO from './MarketingSEO';
import MarketingNavbar from './MarketingNavbar';
import MarketingFooter from './MarketingFooter';
import MarketingReveal from './MarketingReveal';

export default function MarketingLayout({ seo, children, jsonLd }) {
  const { pathname } = useLocation();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    setBooting(true);
    const t = window.setTimeout(() => setBooting(false), 320);
    window.scrollTo({ top: 0, behavior: 'auto' });
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div className={`mkt-page ${booting ? 'mkt-page--booting' : 'mkt-page--ready'}`}>
      <div className="mkt-page__bg" aria-hidden="true">
        <div className="mkt-page__grain" />
        <div className="mkt-page__glow mkt-page__glow--a" />
        <div className="mkt-page__glow mkt-page__glow--b" />
      </div>

      <div className={`mkt-boot ${booting ? 'is-on' : ''}`} aria-hidden={!booting}>
        <div className="mkt-boot__bar" />
      </div>

      <MarketingSEO {...seo} jsonLd={jsonLd} />
      <MarketingNavbar />
      <main className="mkt-main">{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function MarketingPageHero({ kicker, title, subtitle, children }) {
  return (
    <MarketingReveal as="header" className="mkt-page-hero">
      <div className="mkt-shell mkt-shell--narrow">
        {kicker && <p className="mkt-kicker">{kicker}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="mkt-page-hero__sub">{subtitle}</p>}
        {children}
      </div>
    </MarketingReveal>
  );
}

export function MarketingCtaBand({
  title,
  text,
  primaryLabel = 'Start free trial',
  primaryTo = '/login?mode=register',
  secondaryLabel,
  secondaryTo,
}) {
  const { pathname } = useLocation();
  const secTo = secondaryTo || (pathname === '/pricing' ? '/faq' : '/pricing');
  const secLabel = secondaryLabel || (pathname === '/pricing' ? 'Read FAQ' : 'View pricing');

  return (
    <MarketingReveal as="section" className="mkt-cta-band" delay={80}>
      <div className="mkt-shell">
        <div className="mkt-cta-band__inner">
          <h2>{title}</h2>
          <p>{text}</p>
          <div className="mkt-cta-band__actions">
            <Link className="mkt-btn mkt-btn--gold" to={primaryTo}>
              {primaryLabel}
            </Link>
            <Link className="mkt-btn mkt-btn--ghost" to={secTo}>
              {secLabel}
            </Link>
          </div>
        </div>
      </div>
    </MarketingReveal>
  );
}
