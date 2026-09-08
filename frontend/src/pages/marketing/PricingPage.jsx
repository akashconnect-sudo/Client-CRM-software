import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PAGE_SEO } from '../../constants/marketingSeo';
import MarketingLayout, { MarketingPageHero, MarketingCtaBand } from '../../components/marketing/MarketingLayout';
import MarketingReveal from '../../components/marketing/MarketingReveal';
import {
  PER_USER_MONTH_PRICES,
  PACKAGE_META,
  TIER_LABELS,
  SEAT_CAPS,
  pricePerUserPerMonth,
  computePrepaidTotal,
  formatInr,
  signupQuery,
} from '../../constants/modularPricing';

const TABS = ['LEADS', 'IVR', 'COMBO'];
const CYCLES = [3, 6, 12];

export default function PricingPage() {
  const [pkg, setPkg] = useState('COMBO');
  const [tier, setTier] = useState('PROFESSIONAL');
  const [desiredSeats, setDesiredSeats] = useState(5);

  const cards = useMemo(
    () =>
      CYCLES.map((months) => {
        const q = computePrepaidTotal({
          packageKey: pkg,
          tier,
          billingCycleMonths: months,
          desiredSeats,
        });
        return {
          months,
          ...q,
          popular: months === 6 && pkg === 'COMBO',
        };
      }),
    [pkg, tier, desiredSeats]
  );

  const meta = PACKAGE_META[pkg];
  const highlight = cards.find((c) => c.popular) || cards.find((c) => c.months === 6) || cards[0];

  const onSeatsChange = (raw) => {
    const n = Math.max(1, parseInt(raw, 10) || 1);
    const cap = SEAT_CAPS[tier];
    setDesiredSeats(cap != null ? Math.min(n, cap) : n);
  };

  return (
    <MarketingLayout seo={PAGE_SEO.pricing}>
      <MarketingPageHero
        kicker="Simple team pricing"
        title="Pay per person. Pick how long. One payment."
        subtitle="10-day free trial — no card needed. After trial, you pay once for the whole period (UPI / card via Razorpay). Longer plans cost less per person each month."
      />

      <MarketingReveal as="section" className="mkt-shell" delay={40} aria-label="Rate card">
        <div className="mkt-pricing-ratecard">
          <div className="mkt-pricing-ratecard__head">
            <h2>What each person costs per month</h2>
            <p>Rates fall when you commit for longer.</p>
          </div>
          <div className="mkt-compare-wrap">
            <table className="mkt-compare">
              <thead>
                <tr>
                  <th>You buy</th>
                  <th>3 months</th>
                  <th>6 months</th>
                  <th>12 months</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Leads only</td>
                  <td>{formatInr(PER_USER_MONTH_PRICES.LEADS[3])}</td>
                  <td>{formatInr(PER_USER_MONTH_PRICES.LEADS[6])}</td>
                  <td>{formatInr(PER_USER_MONTH_PRICES.LEADS[12])}</td>
                </tr>
                <tr>
                  <td>IVR only</td>
                  <td>{formatInr(PER_USER_MONTH_PRICES.IVR[3])}</td>
                  <td>{formatInr(PER_USER_MONTH_PRICES.IVR[6])}</td>
                  <td>{formatInr(PER_USER_MONTH_PRICES.IVR[12])}</td>
                </tr>
                <tr>
                  <td>Leads + IVR</td>
                  <td>{formatInr(pricePerUserPerMonth('COMBO', 3))}</td>
                  <td>
                    {formatInr(pricePerUserPerMonth('COMBO', 6))}
                    <em className="mkt-table-note">Best value</em>
                  </td>
                  <td>{formatInr(pricePerUserPerMonth('COMBO', 12))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-shell mkt-pricing-builder" delay={80}>
        <div className="mkt-pricing-builder__step">
          <span className="mkt-pricing-builder__n">1</span>
          <div>
            <h2>What do you need?</h2>
            <p>{meta.description}</p>
          </div>
        </div>
        <div className="mkt-mod-tabs" role="tablist" aria-label="Product">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={pkg === id}
              className={`mkt-mod-tab ${pkg === id ? 'mkt-mod-tab--on' : ''}`}
              onClick={() => setPkg(id)}
            >
              {PACKAGE_META[id].name}
            </button>
          ))}
        </div>

        <div className="mkt-pricing-builder__step mkt-pricing-builder__step--spaced">
          <span className="mkt-pricing-builder__n">2</span>
          <div>
            <h2>How many people will use it?</h2>
            <p>Include your Super Admin. This is your billable team size.</p>
          </div>
        </div>

        <div className="mkt-seat-estimator mkt-seat-estimator--clean">
          <div className="mkt-seat-estimator__row">
            <label htmlFor="team-size">Team size</label>
            <input
              id="team-size"
              type="number"
              min={1}
              max={SEAT_CAPS[tier] || 500}
              value={desiredSeats}
              onChange={(e) => onSeatsChange(e.target.value)}
            />
          </div>
          <div className="mkt-seat-estimator__result" key={`${pkg}-${desiredSeats}-${tier}`}>
            <p>
              About <strong>{formatInr(highlight.monthlyTeam)}</strong>
              <span> / month for {desiredSeats} {desiredSeats === 1 ? 'person' : 'people'}</span>
            </p>
            <small>
              Based on the {highlight.months}-month plan · {formatInr(highlight.pricePerUserPerMonth)} each
            </small>
          </div>
        </div>

        <div className="mkt-pricing-builder__step mkt-pricing-builder__step--spaced">
          <span className="mkt-pricing-builder__n">3</span>
          <div>
            <h2>Feature depth (optional)</h2>
            <p>Same module price — tier only changes limits and advanced tools.</p>
          </div>
        </div>
        <div className="mkt-mod-tier-row mkt-mod-tier-row--compact" role="tablist" aria-label="Feature tier">
          {Object.keys(TIER_LABELS).map((id) => (
            <button
              key={id}
              type="button"
              className={`mkt-mod-tier ${tier === id ? 'mkt-mod-tier--on' : ''}`}
              onClick={() => {
                setTier(id);
                const cap = SEAT_CAPS[id];
                if (cap != null && desiredSeats > cap) setDesiredSeats(cap);
              }}
            >
              {TIER_LABELS[id]}
              <span>
                {SEAT_CAPS[id] == null ? 'No max team size' : `Up to ${SEAT_CAPS[id]} users`}
              </span>
            </button>
          ))}
        </div>

        <div className="mkt-pricing-builder__step mkt-pricing-builder__step--spaced">
          <span className="mkt-pricing-builder__n">4</span>
          <div>
            <h2>Choose your prepaid period</h2>
            <p>You pay this amount once for the full period after the trial.</p>
          </div>
        </div>

        <div className="mkt-pricing-grid mkt-pricing-grid--cycles">
          {cards.map((card, i) => (
            <article
              key={card.months}
              className={`mkt-price-card mkt-price-card--v2 ${card.popular ? 'mkt-price-card--popular' : ''}`}
              style={{ '--stagger': `${i * 50}ms` }}
            >
              {card.popular && (
                <span className="mkt-price-card__badge mkt-price-card__badge--popular">Most Popular</span>
              )}
              {pkg === 'COMBO' && (card.months === 6 || card.months === 12) && (
                <span className="mkt-price-card__badge mkt-price-card__badge--ai">AI features included</span>
              )}
              {card.discountPercent > 0 && (
                <span className="mkt-price-card__off">Save {card.discountPercent}%</span>
              )}
              <p className="mkt-price-card__period">{card.months}-month plan</p>
              <p className="mkt-price-card__amount">
                {formatInr(card.pricePerUserPerMonth)}
                <span>per person / month</span>
              </p>
              {card.discountPercent > 0 && (
                <p className="mkt-price-card__was">
                  Was <span className="mkt-strike">{formatInr(card.reference3MonthPrice)}</span> on the 3-month plan
                </p>
              )}
              <div className="mkt-price-card__due">
                <span>You pay once</span>
                <strong>{formatInr(card.total)}</strong>
                <small>
                  Covers {card.seatCount} {card.seatCount === 1 ? 'person' : 'people'} for {card.months} months
                </small>
              </div>
              <ul>
                <li>10-day free trial first</li>
                <li>{meta.name} · {TIER_LABELS[tier]}</li>
                <li>
                  {SEAT_CAPS[tier] == null
                    ? 'No maximum team size'
                    : `Fits teams up to ${SEAT_CAPS[tier]}`}
                </li>
              </ul>
              <Link
                to={signupQuery({
                  packageKey: pkg,
                  tier,
                  billingCycleMonths: card.months,
                  desiredSeats: card.seatCount,
                })}
                className={card.popular ? 'mkt-btn mkt-btn--gold w-full' : 'mkt-btn mkt-btn--ghost w-full'}
              >
                Start 10-Day Free Trial
              </Link>
            </article>
          ))}
        </div>
      </MarketingReveal>

      <MarketingReveal as="section" className="mkt-section mkt-section--inset" delay={100}>
        <p className="mkt-pricing-note mkt-pricing-note--center">
          Need help choosing? Most sales floors pick <strong>Leads + IVR for 6 months</strong>.
          {' '}
          <Link to="/faq">Read the FAQ</Link>.
        </p>
      </MarketingReveal>

      <MarketingCtaBand
        title="Try it free for 10 days"
        text="Create a workspace, invite your team, and pay only when the trial ends."
        primaryLabel="Start 10-Day Free Trial"
        primaryTo={signupQuery({
          packageKey: 'COMBO',
          tier: 'PROFESSIONAL',
          billingCycleMonths: 6,
          desiredSeats: 5,
        })}
      />
    </MarketingLayout>
  );
}
