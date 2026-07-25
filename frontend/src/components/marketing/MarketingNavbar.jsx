import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import BrandLogo from '../BrandLogo';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/modules', label: 'Modules' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
];

export default function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header className={`mkt-nav ${scrolled ? 'mkt-nav--scrolled' : ''} ${menuOpen ? 'mkt-nav--open' : ''}`}>
      <div className="mkt-nav__inner">
        <Link to="/" className="mkt-nav__brand" onClick={() => setMenuOpen(false)}>
          <BrandLogo size="sm" />
          <span>
            <strong>Sales Lead CRM</strong>
            <small>For Indian sales floors</small>
          </span>
        </Link>

        <button
          type="button"
          className="mkt-nav__burger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`mkt-nav__links ${menuOpen ? 'is-open' : ''}`} aria-label="Site">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mkt-nav__link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="mkt-nav__mobile-cta">
            <Link to="/login" className="mkt-btn mkt-btn--ghost" onClick={() => setMenuOpen(false)}>
              Login
            </Link>
            <Link to="/login?mode=register" className="mkt-btn mkt-btn--gold" onClick={() => setMenuOpen(false)}>
              Start free trial
            </Link>
          </div>
        </nav>

        <div className="mkt-nav__actions">
          <Link to="/login" className="mkt-btn mkt-btn--ghost mkt-btn--sm">
            Login
          </Link>
            <Link to="/login?mode=register" className="mkt-btn mkt-btn--gold mkt-btn--sm">
              Start free trial
            </Link>
        </div>
      </div>
    </header>
  );
}
