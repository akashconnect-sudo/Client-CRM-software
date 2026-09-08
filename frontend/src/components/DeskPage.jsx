export default function DeskPage({ kicker, title, subtitle, actions, children }) {
  return (
    <div className="page-enter">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          {kicker ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-1" style={{ color: '#c9a227' }}>
              {kicker}
            </p>
          ) : null}
          <h1 className="text-2xl font-bold text-main tracking-tight">{title}</h1>
          {subtitle ? <p className="text-sm text-muted mt-1">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
