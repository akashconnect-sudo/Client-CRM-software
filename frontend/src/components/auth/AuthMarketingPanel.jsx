import AuthBrandArt from './AuthBrandArt';
import BrandLogo from '../BrandLogo';
import { IconArrowRight } from './AuthIcons';

const CAPABILITIES = [
  {
    n: '01',
    title: 'Capture every lead',
    desc: 'Import, manual entry, or webhooks — one Lead Vault.',
  },
  {
    n: '02',
    title: 'Call with IVR',
    desc: 'Click-to-call from the profile; recordings stay on the timeline.',
  },
  {
    n: '03',
    title: 'Close the loop',
    desc: 'Follow-up Radar and reports keep the floor disciplined.',
  },
];

export default function AuthMarketingPanel({ onGetStarted }) {
  return (
    <aside className="auth-brand hidden lg:flex" aria-label="Product overview">
      <div className="auth-brand-noise" />
      <div className="auth-brand-vignette" />

      <div className="auth-brand-inner">
        <header className="auth-brand-header flex flex-col gap-4">
          <BrandLogo size="lg" />
          <span className="auth-brand-tag">CRM + IVR · Pay per person</span>
        </header>

        <div className="auth-brand-main">
          <h2 className="auth-brand-title">
            Sell with
            <em> signal,</em>
            <br />
            not noise.
          </h2>
          <p className="auth-brand-desc">
            A focused workspace for leads, calls, and handoffs — designed so reps spend time talking,
            not clicking.
          </p>

          <ul className="auth-brand-list">
            {CAPABILITIES.map((item) => (
              <li key={item.n} className="auth-brand-list-item">
                <span className="auth-brand-list-n">{item.n}</span>
                <div>
                  <p className="auth-brand-list-title">{item.title}</p>
                  <p className="auth-brand-list-desc">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <AuthBrandArt />

        <footer className="auth-brand-footer">
          <blockquote className="auth-brand-quote">
            <p>“Finally a CRM that doesn’t fight the sales floor.”</p>
            <cite>— Operations lead, mid-market team</cite>
          </blockquote>
          <button type="button" onClick={onGetStarted} className="auth-brand-cta">
            <span>Start free workspace</span>
            <IconArrowRight />
          </button>
        </footer>
      </div>
    </aside>
  );
}
