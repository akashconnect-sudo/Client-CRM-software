import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PACKAGE_META,
  TIER_LABELS,
  SEAT_CAPS,
  computePrepaidTotal,
  formatInr,
} from '../../constants/modularPricing';

const PACKAGES = ['LEADS', 'IVR', 'COMBO'];
const TIERS = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
const CYCLES = [3, 6, 12];

const PACKAGE_HINT = {
  LEADS: 'After login: Leads + Follow-ups only',
  IVR: 'After login: Calls + IVR setup only',
  COMBO: 'After login: Leads, Follow-ups, and Calls together',
};

const TIER_HINT = {
  STARTER: 'Up to 5 people',
  PROFESSIONAL: 'Up to 25 people · reports & automation',
  ENTERPRISE: 'No team size cap · AI extras',
};

export default function ModuleEntitlementPicker({ value, onChange }) {
  const packageKey = value?.packageKey || 'COMBO';
  const tier = value?.tier || 'PROFESSIONAL';
  const cycle = value?.billingCycleMonths || 6;
  const desiredSeats = value?.desiredSeats || value?.seatCount || 5;

  const quote = useMemo(
    () =>
      computePrepaidTotal({
        packageKey,
        tier,
        billingCycleMonths: cycle,
        desiredSeats,
      }),
    [packageKey, tier, cycle, desiredSeats]
  );

  const set = (patch) => {
    const nextPkg = patch.packageKey || packageKey;
    const nextTier = patch.tier || tier;
    const nextCycle = patch.billingCycleMonths || cycle;
    let nextSeats = patch.desiredSeats != null ? patch.desiredSeats : desiredSeats;
    const cap = SEAT_CAPS[nextTier];
    if (cap != null) nextSeats = Math.min(nextSeats, cap);
    const q = computePrepaidTotal({
      packageKey: nextPkg,
      tier: nextTier,
      billingCycleMonths: nextCycle,
      desiredSeats: nextSeats,
    });
    onChange?.({
      packageKey: nextPkg,
      modules: q.modules,
      tier: nextTier,
      billingCycleMonths: nextCycle,
      desiredSeats: nextSeats,
      seatCount: q.seatCount,
      extraSeats: q.extraSeats,
      quote: q,
    });
  };

  const peopleLabel = quote.seatCount === 1 ? 'person' : 'people';
  const popularCycle = packageKey === 'COMBO' && cycle === 6;

  return (
    <section className="plan-picker" aria-label="Choose your plan">
      <header className="plan-picker__head">
        <h3>Choose your plan</h3>
        <p>Start with a 10-day free trial. You only pay after the trial ends.</p>
      </header>

      <div className="plan-picker__block">
        <p className="plan-picker__label">What do you need?</p>
        <div className="plan-seg" role="tablist" aria-label="Product">
          {PACKAGES.map((id) => (
            <button
              key={id}
              type="button"
              className={`plan-seg-btn ${packageKey === id ? 'plan-seg-btn--on' : ''}`}
              onClick={() => set({ packageKey: id })}
            >
              <span className="plan-seg-name">{PACKAGE_META[id].name}</span>
            </button>
          ))}
        </div>
        <p className="plan-picker__hint">{PACKAGE_HINT[packageKey]}</p>
      </div>

      <div className="plan-picker__block">
        <label className="plan-picker__label" htmlFor="plan-team-size">
          How many people will use it?
        </label>
        <div className="plan-picker__seats">
          <input
            id="plan-team-size"
            type="number"
            min={1}
            max={SEAT_CAPS[tier] || 500}
            className="auth-input plan-picker__seats-input"
            value={desiredSeats}
            onChange={(e) => set({ desiredSeats: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          />
          <span>Include yourself (Super Admin)</span>
        </div>
      </div>

      <div className="plan-picker__block">
        <p className="plan-picker__label">Pay for how long?</p>
        <div className="plan-seg plan-seg--cycles" role="tablist" aria-label="Billing period">
          {CYCLES.map((months) => {
            const q = computePrepaidTotal({
              packageKey,
              tier,
              billingCycleMonths: months,
              desiredSeats,
            });
            const isOn = cycle === months;
            const isBest = months === 6 && packageKey === 'COMBO';
            return (
              <button
                key={months}
                type="button"
                className={`plan-seg-btn ${isOn ? 'plan-seg-btn--on' : ''}`}
                onClick={() => set({ billingCycleMonths: months })}
              >
                {isBest && <span className="plan-seg-badge">Best value</span>}
                {(months === 6 || months === 12) && packageKey === 'COMBO' && (
                  <span className="plan-seg-badge plan-seg-badge--ai">AI included</span>
                )}
                <span className="plan-seg-name">{months} months</span>
                <span className="plan-seg-price">{formatInr(q.pricePerUserPerMonth)}</span>
                <span className="plan-seg-sub">per person / month</span>
                {q.discountPercent > 0 && (
                  <span className="plan-seg-save">Save {q.discountPercent}%</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="plan-picker__block">
        <p className="plan-picker__label">Feature level</p>
        <div className="plan-seg" role="tablist" aria-label="Feature tier">
          {TIERS.map((id) => (
            <button
              key={id}
              type="button"
              className={`plan-seg-btn ${tier === id ? 'plan-seg-btn--on' : ''}`}
              onClick={() => set({ tier: id })}
            >
              <span className="plan-seg-name">{TIER_LABELS[id]}</span>
            </button>
          ))}
        </div>
        <p className="plan-picker__hint">
          Same module price — {TIER_HINT[tier]}.{' '}
          <Link to="/pricing" className="plan-picker__link">
            Compare plans
          </Link>
        </p>
      </div>

      <aside className="plan-summary" aria-live="polite">
        <p className="plan-summary__eyebrow">After your free trial</p>
        <p className="plan-summary__total">
          You pay once <strong>{formatInr(quote.total)}</strong>
        </p>
        <ul className="plan-summary__lines">
          <li>
            {formatInr(quote.pricePerUserPerMonth)} per person × {quote.seatCount} {peopleLabel} ×{' '}
            {quote.months} months
          </li>
          <li>
            About {formatInr(quote.monthlyTeam)}/month · {PACKAGE_META[packageKey].name} ·{' '}
            {TIER_LABELS[tier]}
          </li>
          {popularCycle && <li>Most sales floors pick this option</li>}
        </ul>
        <p className="plan-summary__note">No card needed to start the trial.</p>
      </aside>
    </section>
  );
}
