import BrandLogo from '../BrandLogo';
import ThemeToggle from '../ThemeToggle';

/**
 * Left auth column — premium workspace entry (logo gold matches brand mark).
 */
export default function AuthFormPanel({ children, showBrandText = true }) {
  return (
    <section className="auth-form-panel auth-form-panel--premium flex-1 flex flex-col">
      <div className="auth-form-ambient" aria-hidden>
        <div className="auth-form-grid" />
        <div className="auth-form-orb auth-form-orb--gold" />
        <div className="auth-form-orb auth-form-orb--dim" />
      </div>

      <header className="auth-form-header auth-form-header--premium">
        <div className="auth-form-brand auth-form-brand--premium">
          <div className="auth-form-logo-frame">
            <BrandLogo size="lg" />
          </div>
          {showBrandText && (
            <div className="auth-form-brand-text">
              <p className="auth-form-brand-name">Sales Lead CRM</p>
              <p className="auth-form-brand-tag">
                <span className="auth-form-brand-dot" aria-hidden />
                Secure workspace · Pay per person
              </p>
            </div>
          )}
        </div>
        <ThemeToggle className="auth-form-theme" />
      </header>

      <div className="auth-form-body auth-form-body--premium flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-10 xl:px-14 py-6 pb-10">
        <div className="auth-form-surface w-full max-w-[480px] mx-auto">
          <div className="auth-form-surface-inner">{children}</div>
        </div>
        <p className="auth-form-trust">
          <span className="auth-form-trust-icon" aria-hidden>◆</span>
          Encrypted sign-in · Multi-tenant workspace
        </p>
      </div>
    </section>
  );
}
