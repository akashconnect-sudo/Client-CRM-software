import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FEATURE_UNLOCK_HINT } from '../constants/workspaceNav';

export default function PlanLocked({ feature: featureProp }) {
  const { isAdmin } = useAuth();
  const [params] = useSearchParams();
  const feature = featureProp || params.get('feature') || params.get('unlock');
  const hint = FEATURE_UNLOCK_HINT[feature] || { title: 'This module', need: 'an upgraded plan' };

  return (
    <div className="page-enter max-w-lg">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-1" style={{ color: '#c9a227' }}>
        Plan gate
      </p>
      <h1 className="text-2xl font-bold text-main mb-2">{hint.title} is locked</h1>
      <p className="text-sm text-muted mb-6">
        This workspace plan does not include this service. Unlock it with <strong className="text-main">{hint.need}</strong>.
      </p>
      <div className="flex flex-wrap gap-2">
        {isAdmin ? (
          <Link to="/settings?focus=subscription" className="btn-primary">Open Settings / billing</Link>
        ) : null}
        <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </div>
    </div>
  );
}
