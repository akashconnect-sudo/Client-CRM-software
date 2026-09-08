import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import { CommandPaletteHint } from './CommandPalette';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { sidebarOpen, openSidebar } = useLayout();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const initial = (user?.name || 'U').trim().charAt(0).toUpperCase();

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/leads?search=${encodeURIComponent(q)}` : '/leads');
  };

  return (
    <header className="app-topbar">
      <div className="app-topbar__left">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={openSidebar}
            className="app-topbar__icon-btn"
            aria-label="Open menu"
            title="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <form className="app-topbar__search" onSubmit={onSearch} role="search">
          <svg className="app-topbar__search-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21 21l-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers by name or phone"
            aria-label="Search customers"
          />
        </form>
      </div>

      <div className="app-topbar__right">
        <CommandPaletteHint />
        <ThemeToggle />
        <NotificationBell />
        <div className="app-topbar__user" title={user?.email || user?.name}>
          <div className="app-topbar__user-text">
            <span className="app-topbar__user-name">{user?.name}</span>
            {user?.companyName && (
              <span className="app-topbar__user-co">{user.companyName}</span>
            )}
          </div>
          <span className="app-topbar__avatar" aria-hidden="true">
            {initial}
          </span>
        </div>
        <button type="button" onClick={logout} className="btn-secondary text-xs sm:text-sm px-2.5 sm:px-3 py-2">
          <span className="hidden sm:inline">Logout</span>
          <span className="sm:hidden">Exit</span>
        </button>
      </div>
    </header>
  );
}
