import { Link } from 'react-router-dom';
import BrandLogo from '../BrandLogo';

export default function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-shell">
        <div className="mkt-footer__top">
          <div className="mkt-footer__brand">
            <Link to="/" className="mkt-footer__logo">
              <BrandLogo size="sm" />
              <span>
                <strong>Sales Lead CRM</strong>
                <small>CRM + IVR for sales teams</small>
              </span>
            </Link>
            <p>
              One desk for leads, IVR calls, follow-ups, and reports — built for Indian sales floors
              that need the team working from the same pipeline.
            </p>
          </div>

          <nav className="mkt-footer__cols" aria-label="Footer">
            <div>
              <h4>Product</h4>
              <Link to="/features">Features</Link>
              <Link to="/modules">Modules</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/faq">FAQ</Link>
            </div>
            <div>
              <h4>Get started</h4>
              <Link to="/login">Login</Link>
              <Link to="/login?mode=register">Start free trial</Link>
              <Link to="/pricing">Compare plans</Link>
            </div>
            <div>
              <h4>Built for</h4>
              <p className="mkt-footer__chips">
                <span>Real estate</span>
                <span>Ed-tech</span>
                <span>Local services</span>
                <span>B2B sales</span>
                <span>Agencies</span>
              </p>
            </div>
          </nav>
        </div>

        <div className="mkt-footer__bar">
          <p>© {new Date().getFullYear()} Sales Lead CRM</p>
          <p>INR · Razorpay · Email OTP · Multi-tenant</p>
        </div>
      </div>
    </footer>
  );
}
