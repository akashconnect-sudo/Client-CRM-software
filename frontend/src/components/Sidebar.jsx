import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { canAccessFeatureForUser } from '../utils/planAccess';
import { WORKSPACE_NAV } from '../constants/workspaceNav';
import { NavIcons } from './nav/NavIcons';
import BrandLogo from './BrandLogo';

export default function Sidebar() {
  const { user, isAdmin } = useAuth();
  const { sidebarOpen, closeSidebar } = useLayout();
  const navigate = useNavigate();

  const handleNavClick = () => {
    if (window.innerWidth < 1024) closeSidebar();
  };

  const renderItem = (item) => {
    if (item.adminOnly && !isAdmin) return null;
    const enabled = !item.feature || canAccessFeatureForUser(user, item.feature);
    const className = (isActive) =>
      `crm-nav-link ${
        !enabled ? 'crm-nav-link--locked' : isActive ? 'crm-nav-link--active' : 'crm-nav-link--idle'
      }`;

    if (!enabled) {
      return (
        <button
          key={item.to}
          type="button"
          className={className(false)}
          onClick={() => {
            handleNavClick();
            navigate(
              isAdmin
                ? `/settings?focus=subscription&unlock=${encodeURIComponent(item.feature)}`
                : `/locked?feature=${encodeURIComponent(item.feature)}`
            );
          }}
          title={`${item.label} — not in this plan`}
        >
          <span className="crm-nav-ico">{item.icon}</span>
          <span className="truncate flex-1 text-left">{item.label}</span>
          <span className="crm-nav-lock">{NavIcons.lock}</span>
        </button>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/dashboard'}
        onClick={handleNavClick}
        className={({ isActive }) => className(isActive)}
      >
        <span className="crm-nav-ico">{item.icon}</span>
        <span className="truncate">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } bg-black/60`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        className={`app-sidebar fixed left-0 top-0 z-50 lg:z-30 h-full w-[min(85vw,280px)] sm:w-72 lg:w-64 flex flex-col border-r border-default shadow-2xl lg:shadow-none transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--sidebar-bg)' }}
        aria-hidden={!sidebarOpen}
      >
        <div className="app-sidebar__brand">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="sm" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-main truncate">Sales Lead CRM</h1>
              <p className="text-xs text-muted truncate">Leads · IVR · Follow-ups</p>
            </div>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-main shrink-0"
            style={{ backgroundColor: 'var(--surface-hover)' }}
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-2.5 sm:p-3 space-y-3 overflow-y-auto" aria-label="Main">
          {WORKSPACE_NAV.map((section) => {
            const nodes = section.items.map(renderItem).filter(Boolean);
            if (!nodes.length) return null;
            return (
              <div key={section.id}>
                {section.label ? (
                  <p className="crm-nav-section">{section.label}</p>
                ) : null}
                <div className="space-y-0.5">{nodes}</div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 sm:p-4 border-t border-default safe-bottom shrink-0">
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <p className="font-medium text-sm text-main truncate">{user?.name}</p>
            <p className="text-muted text-xs truncate mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
