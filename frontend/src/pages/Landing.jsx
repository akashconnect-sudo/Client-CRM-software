import { Link } from 'react-router-dom';
import { PAGE_SEO, SITE_NAME, SITE_URL } from '../constants/marketingSeo';
import {
  TRIAL_HEADLINE,
  MARKETING_STATS,
  MARKETING_FEATURES,
  MARKETING_MODULES,
  HOME_PROBLEM_POINTS,
  HOME_WORKFLOW,
  HOME_BENEFITS,
  HOME_CAPABILITIES,
  HOME_TESTIMONIALS,
  PLAN_EXCLUSIVE_FEATURES,
  WHY_US_COMPARE,
  MOBILE_WEB_POINTS,
} from '../constants/marketingContent';
import MarketingLayout, { MarketingCtaBand } from '../components/marketing/MarketingLayout';
import MarketingReveal from '../components/marketing/MarketingReveal';

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    description: '10-day free trial',
    url: `${SITE_URL}/login?mode=register`,
  },
  description: PAGE_SEO.home.description,
  url: SITE_URL,
};

export default function Landing() {
  return (
    <MarketingLayout seo={PAGE_SEO.home} jsonLd={homeJsonLd}>
      <MarketingReveal as="section" className="mkt-home-hero">
        <div className="mkt-home-hero__copy">
          <p className="mkt-trial-pill">{TRIAL_HEADLINE}</p>
          <p className="mkt-kicker">Sales CRM · Lead pipeline · IVR calling</p>
          <h1>
            The CRM your floor actually opens — leads, <em>IVR calls</em>, and follow-ups in one desk.
          </h1>
          <p className="mkt-home-hero__lead">
            Sales Lead CRM is built for Indian sales teams that need a real workspace: assign owners,
            dial from the lead profile over IVR, log recordings on the timeline, and never lose a
            callback again. Pay per person. Full <strong>10-day trial</strong> — no card.
          </p>
          <div className="mkt-home-hero__actions">
            <Link to="/login?mode=register" className="mkt-btn mkt-btn--gold">
              Start free trial
            </Link>
            <Link to="/features" className="mkt-btn mkt-btn--ghost">
              Explore features
            </Link>
          </div>
          <dl className="mkt-home-stats">
            {MARKETING_STATS.map((s) => (
              <div key={s.label}>
                <dt>{s.value}</dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mkt-home-mock" aria-hidden="true">
          <div className="mkt-mock-window">
            <div className="mkt-mock-window__chrome">
              <span />
              <span />
              <span />
              <em>Command Center — today</em>
            </div>
            <div className="mkt-mock-rows">
              <div className="mkt-mock-row mkt-mock-row--hot">
                <span className="mkt-mock-pulse">92</span>
                <div>
                  <strong>Rahul S. · Hot lead</strong>
                  <small>Assigned · Follow-up in 2h</small>
                </div>
              </div>
              <div className="mkt-mock-row">
                <span className="mkt-mock-pulse mkt-mock-pulse--warm">71</span>
                <div>
                  <strong>Priya K. · New enquiry</strong>
                  <small>Round-robin queued</small>
                </div>
              </div>
              <div className="mkt-mock-row">
                <span className="mkt-mock-pulse mkt-mock-pulse--cold">44</span>
                <div>
                  <strong>IVR call · 4m 12s</strong>
                  <small>Recording on lead timeline</small>
                </div>
              </div>
            </div>
            <div className="mkt-mock-footer">
              <span>Trial day 3 of 10</span>
              <span>8 follow-ups due</span>
            </div>
          </div>
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-section--inset" delay={40}>
        <div className="mkt-section__head">
          <p className="mkt-kicker">Everything in one CRM</p>
          <h2>Built for doers who live on the sales floor</h2>
          <p className="mkt-section__sub">
            Not another spreadsheet. Not a dialer that forgets your pipeline. One product for leads,
            IVR, follow-ups, and reports.
          </p>
        </div>
        <div className="mkt-capability-grid">
          {HOME_CAPABILITIES.map((item) => (
            <article key={item.title} className="mkt-capability-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <p className="mkt-section__link mkt-section__link--center">
          <Link to="/features" className="mkt-btn mkt-btn--ghost">
            See all features
          </Link>
        </p>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section" delay={60}>
        <div className="mkt-section__head">
          <p className="mkt-kicker">Why teams stay</p>
          <h2>More conversations closed — fewer tools juggled</h2>
        </div>
        <div className="mkt-benefit-grid">
          {HOME_BENEFITS.map((item) => (
            <article key={item.title} className="mkt-benefit-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-problem" delay={40}>
        <div className="mkt-section__head mkt-section__head--left">
          <p className="mkt-kicker">Sound familiar?</p>
          <h2>Most teams lose deals in the handoff — not the pitch.</h2>
        </div>
        <ul className="mkt-problem-list">
          {HOME_PROBLEM_POINTS.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section" delay={50}>
        <div className="mkt-section__head">
          <p className="mkt-kicker">How it works</p>
          <h2>From new lead to closed deal — without tab hopping</h2>
        </div>
        <ol className="mkt-workflow">
          {HOME_WORKFLOW.map((step, i) => (
            <li key={step.title}>
              <span className="mkt-workflow__n">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mkt-section__link">
          <Link to="/modules">Explore all seven modules →</Link>
        </p>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-plan-showcase" delay={40}>
        <div className="mkt-section__head">
          <p className="mkt-kicker">Plans</p>
          <h2>Start on Starter — unlock IVR on Professional</h2>
          <p className="mkt-section__sub">
            Your trial starts on the plan you pick at signup. Upgrade when the floor needs Call Bridge
            and reports.
          </p>
        </div>
        <div className="mkt-plan-showcase__grid">
          {PLAN_EXCLUSIVE_FEATURES.map((plan) => (
            <article
              key={plan.id}
              className={`mkt-plan-card ${plan.popular ? 'mkt-plan-card--popular' : ''}`}
            >
              {plan.popular && <span className="mkt-plan-card__badge">Most picked</span>}
              <span className="mkt-plan-card__tag">{plan.tag}</span>
              <h3>{plan.name}</h3>
              <p className="mkt-plan-card__price">{plan.price}</p>
              <p className="mkt-plan-card__headline">{plan.headline}</p>
              <ul>
                {plan.exclusives.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to={`/login?mode=register&plan=${plan.id}`} className="mkt-btn mkt-btn--ghost mkt-btn--sm">
                Trial {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-section--inset mkt-versus" delay={40}>
        <div className="mkt-section__head">
          <p className="mkt-kicker">Compare</p>
          <h2>Spreadsheet vs dialer-only tools vs Sales Lead CRM</h2>
          <p className="mkt-section__sub">
            Honest positioning: we are a sales CRM with IVR on the lead — not a SIM auto-dialer app.
          </p>
        </div>
        <div className="mkt-compare-wrap">
          <table className="mkt-compare mkt-compare--versus">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Sales Lead CRM</th>
                <th>Spreadsheet</th>
                <th>Dialer-only tools</th>
              </tr>
            </thead>
            <tbody>
              {WHY_US_COMPARE.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className="mkt-compare__us">{row.us}</td>
                  <td>{row.sheets}</td>
                  <td>{row.dialer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-mobile-strip" delay={50}>
        <div className="mkt-mobile-strip__inner">
          <div className="mkt-mobile-strip__copy">
            <p className="mkt-kicker">On the move</p>
            <h2>Mobile-ready web desk — Play Store app coming</h2>
            <p>
              Reps already use the CRM from phone browsers on the floor. A native Android app is on
              the roadmap; until then you get the full responsive desk.
            </p>
            <ul>
              {MOBILE_WEB_POINTS.map((point) => (
                <li key={point.title}>
                  <strong>{point.title}</strong>
                  <span>{point.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mkt-mobile-strip__device" aria-hidden="true">
            <div className="mkt-phone-frame">
              <div className="mkt-phone-frame__screen">
                <small>Follow-up Radar</small>
                <strong>3 due today</strong>
                <div className="mkt-phone-frame__row mkt-phone-frame__row--urgent">Overdue · Callback</div>
                <div className="mkt-phone-frame__row">Due 4pm · Warm lead</div>
                <div className="mkt-phone-frame__row">Pending · Site visit</div>
              </div>
            </div>
          </div>
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-section--inset" delay={40}>
        <div className="mkt-section__head">
          <p className="mkt-kicker">Highlights</p>
          <h2>Features your team will open every morning</h2>
        </div>
        <div className="mkt-feature-teaser">
          {MARKETING_FEATURES.slice(0, 6).map((f) => (
            <article key={f.slug}>
              <span className="mkt-feature-teaser__cat">{f.category}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
        <p className="mkt-section__link mkt-section__link--center">
          <Link to="/features" className="mkt-btn mkt-btn--ghost">
            All features
          </Link>
        </p>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section" delay={40}>
        <div className="mkt-section__head">
          <p className="mkt-kicker">Modules</p>
          <h2>Seven rooms. One login.</h2>
        </div>
        <div className="mkt-module-teaser">
          {MARKETING_MODULES.map((m) => (
            <Link key={m.id} to="/modules" className="mkt-module-teaser__card">
              <span>{m.tag}</span>
              <strong>{m.name}</strong>
              <p>{m.summary}</p>
            </Link>
          ))}
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-testimonials" delay={50}>
        <div className="mkt-section__head">
          <p className="mkt-kicker">From the floor</p>
          <h2>What ops leads say after the first week</h2>
        </div>
        <div className="mkt-testimonial-grid">
          {HOME_TESTIMONIALS.map((t) => (
            <blockquote key={t.name} className="mkt-testimonial-card">
              <p>&ldquo;{t.quote}&rdquo;</p>
              <footer>
                — {t.name}, {t.role}
              </footer>
            </blockquote>
          ))}
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-pricing-teaser" delay={40}>
        <div className="mkt-pricing-teaser__inner">
          <div>
            <p className="mkt-kicker">Pricing</p>
            <h2>{TRIAL_HEADLINE}</h2>
            <p>
              Pay per person — Leads, IVR, or both. Longer prepaid plans cost less each month.
              Most floors pick Leads + IVR for 6 months.
            </p>
          </div>
          <Link to="/pricing" className="mkt-btn mkt-btn--gold">
            View pricing
          </Link>
        </div>
      </MarketingReveal>

      <MarketingCtaBand
        title="Run your sales desk in one CRM"
        text="Create a workspace, import your team, connect IVR when ready — 10 days free, no card required."
        primaryLabel="Start free trial"
        primaryTo="/login?mode=register"
      />
    </MarketingLayout>
  );
}
