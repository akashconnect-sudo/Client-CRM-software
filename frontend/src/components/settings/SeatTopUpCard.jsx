import { useEffect, useState } from 'react';
import { billingApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import { formatInr } from '../../constants/modularPricing';

export default function SeatTopUpCard() {
  const { isSuperAdmin, setSessionFromToken } = useAuth();
  const [sub, setSub] = useState(null);
  const [addSeats, setAddSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    billingApi
      .subscription()
      .then((res) => setSub(res.data.data))
      .catch(() => setSub(null));

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin]);

  if (!isSuperAdmin || !sub) return null;

  const price = sub.pricePerUserPerMonth || 0;
  const months = Math.max(sub.remainingMonths || sub.billingCycleMonths || 3, 0.033);
  const estimate = Math.round(addSeats * price * months);
  const atCap = sub.seatCap != null && (sub.seatCount || 1) >= sub.seatCap;

  const buy = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await billingApi.seatCheckout({ addSeats });
      const session = res.data.data;
      const payment = await openRazorpayCheckout(session);
      await billingApi.seatConfirm({
        addSeats: session.addSeats || addSeats,
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      });
      const token = localStorage.getItem('token');
      if (token) await setSessionFromToken(token);
      await load();
      setMessage(`Seats updated.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Seat top-up failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-main">Seat top-up</h2>
        <p className="text-sm text-muted mt-1">
          Billable seats <strong className="text-main">{sub.seatCount || 1}</strong>
          {sub.seatCap != null ? ` · tier cap ${sub.seatCap}` : ' · no tier cap (still billed per seat)'}
          {' · '}
          {formatInr(price)}/user/mo
        </p>
      </div>
      {atCap ? (
        <p className="text-sm text-amber-400">Tier seat cap reached. Upgrade tier to buy more seats.</p>
      ) : (
        <>
          <label className="block text-xs text-muted">
            Extra seats to buy
            <input
              type="number"
              min={1}
              max={200}
              className="input mt-1 w-full max-w-[140px]"
              value={addSeats}
              onChange={(e) => setAddSeats(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </label>
          <p className="text-sm text-muted">
            Est. {formatInr(estimate)} ({formatInr(price)} × {addSeats} × ~{Number(months).toFixed(1)} mo left)
          </p>
          <button type="button" className="btn-primary" disabled={busy} onClick={buy}>
            {busy ? 'Processing…' : 'Pay seat top-up'}
          </button>
        </>
      )}
      {message && <p className="text-sm text-emerald-500">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
