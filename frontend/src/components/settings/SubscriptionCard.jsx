import { useEffect, useState } from 'react';
import { billingApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import { formatInr } from '../../constants/modularPricing';

export default function SubscriptionCard() {
  const { user, isSuperAdmin, setSessionFromToken } = useAuth();
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [subRes, plansRes] = await Promise.all([
          billingApi.subscription(),
          billingApi.plans(),
        ]);
        if (!cancelled) {
          setSub(subRes.data.data);
          setPlans(plansRes.data.data || []);
          setSelectedPlanId(subRes.data.data?.plan || '');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Could not load subscription');
          if (user?.company) {
            const fallbackSub = {
              plan: user.company.plan,
              subscriptionStatus: user.company.subscriptionStatus,
              planDetails: null,
            };
            setSub(fallbackSub);
            setSelectedPlanId(fallbackSub.plan || '');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const applyPlan = async () => {
    if (!selectedPlanId) return;
    setActivating(true);
    setMessage('');
    setError('');
    try {
      const res = await billingApi.checkout({
        plan: selectedPlanId,
        tier: selectedPlanId,
        modules: sub?.modules || user?.modules || ['LEADS', 'IVR'],
        billingCycleMonths: sub?.billingCycleMonths || 6,
        seatCount: sub?.seatCount || 1,
      });
      const session = res.data.data;
      if (session?.provider !== 'razorpay') {
        throw new Error('Real payment gateway is not configured');
      }
      const payment = await openRazorpayCheckout(session);
      await billingApi.confirmPayment({
        plan: selectedPlanId,
        tier: selectedPlanId,
        modules: sub?.modules || user?.modules || ['LEADS', 'IVR'],
        billingCycleMonths: sub?.billingCycleMonths || 6,
        seatCount: sub?.seatCount || 1,
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      });
      const token = localStorage.getItem('token');
      if (token) await setSessionFromToken(token);
      const subRes = await billingApi.subscription();
      setSub(subRes.data.data);
      setSelectedPlanId(subRes.data.data?.plan || selectedPlanId);
      setMessage(`Plan updated to ${subRes.data.data?.planDetails?.name || selectedPlanId}`);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Plan update failed');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-card">
        <p className="text-muted text-sm">Loading subscription…</p>
      </div>
    );
  }

  const active = sub?.subscriptionStatus === 'ACTIVE';
  const currentPlanId = sub?.plan || user?.plan;
  const planInfo = sub?.planDetails || plans.find((p) => p.id === currentPlanId);

  return (
    <div className="profile-card">
      <div className="profile-card-head">
        <div>
          <h2 className="profile-card-title">Subscription & billing</h2>
          <p className="profile-card-sub">Plan payment required to use CRM</p>
        </div>
        <span className={`profile-verified-badge ${active ? '' : 'profile-verified-badge--warn'}`}>
          {active ? 'Active' : 'Payment pending'}
        </span>
      </div>

      <div className="profile-readonly-grid mb-4">
        <div className="profile-field-block profile-field-block--wide">
          <span className="profile-label">Company ID (webhooks)</span>
          <span className="profile-value profile-value-mono text-xs break-all">{user?.companyId}</span>
        </div>
        <div className="profile-field-block">
          <span className="profile-label">Plan</span>
          <span className="profile-value">
            {planInfo?.name || sub?.plan || '—'}
            {planInfo?.priceLabel ? ` — ${planInfo.priceLabel}${planInfo.period || ''}` : ''}
          </span>
        </div>
        <div className="profile-field-block">
          <span className="profile-label">Modules</span>
          <span className="profile-value">
            {(sub?.modules || user?.modules || []).join(' · ') || '—'}
            {sub?.billingCycleMonths ? ` · ${sub.billingCycleMonths} mo` : ''}
          </span>
        </div>
        <div className="profile-field-block">
          <span className="profile-label">Seats</span>
          <span className="profile-value">
            {sub?.seatCount || sub?.effectiveSeats || '—'} billable
            {sub?.pricePerUserPerMonth
              ? ` · ${formatInr(sub.pricePerUserPerMonth)}/user/mo`
              : ''}
            {sub?.seatCap != null ? ` · cap ${sub.seatCap}` : ' · no cap'}
          </span>
        </div>
        {sub?.ivrIntegration && (
          <div className="profile-field-block">
            <span className="profile-label">IVR</span>
            <span className="profile-value">
              {sub.ivrIntegration.mode} · {sub.ivrIntegration.provider || '—'} · {sub.ivrIntegration.status}
            </span>
          </div>
        )}
      </div>

      {message && <div className="alert-success mb-4">{message}</div>}
      {error && <div className="alert-error mb-4 text-sm">{error}</div>}

      {isSuperAdmin && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Select plan for this workspace</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {plans.map((plan) => {
              const selected = selectedPlanId === plan.id;
              const isCurrent = currentPlanId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    selected
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-default hover:border-primary-500/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-main">{plan.name}</p>
                  <p className="text-xs text-muted">
                    {plan.priceLabel}
                    {plan.period}
                    {isCurrent ? ' · Current' : ''}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            disabled={activating || !selectedPlanId}
            onClick={applyPlan}
          >
            {activating
              ? 'Updating…'
              : active
                ? 'Pay securely and update plan'
                : `Pay ${(plans.find((p) => p.id === selectedPlanId)?.priceLabel || planInfo?.priceLabel || '').trim()} & activate`}
          </button>
        </div>
      )}
    </div>
  );
}
