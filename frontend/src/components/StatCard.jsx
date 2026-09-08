import { Link } from 'react-router-dom';

export default function StatCard({ title, value, subtitle, icon, color = 'primary', to, hint }) {
  const iconStyles = {
    primary: 'bg-primary-600/15 text-primary-500 dark:text-primary-400',
    gold: 'bg-[rgba(201,162,39,0.14)] text-[#c9a227]',
    green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    red: 'bg-red-500/15 text-red-600 dark:text-red-400',
    slate: 'bg-slate-500/15 text-muted',
  };

  const inner = (
    <div className="stat-card__inner">
      <div className="min-w-0 flex-1">
        <p className="stat-card__title">{title}</p>
        <p className="stat-card__value">{value ?? 0}</p>
        {subtitle && <p className="stat-card__sub">{subtitle}</p>}
        {to && <p className="stat-card__hint">{hint || 'Open →'}</p>}
      </div>
      {icon && (
        <div className={`stat-card__icon ${iconStyles[color] || iconStyles.primary}`}>
          {icon}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="stat-card stat-card--link group no-underline">
        {inner}
      </Link>
    );
  }

  return <div className="stat-card">{inner}</div>;
}
