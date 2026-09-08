import { useState } from 'react';
import { billingApi } from '../../api';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import { formatInr } from '../../constants/modularPricing';

export default function PaymentStep({
  paymentToken,
  planDetails,
  modules,
  tier,
  billingCycleMonths,
  seatCount,
  extraSeats,
  onSuccess,
  onError,
}) {
  const [loading, setLoading] = useState(false);

  const entitlement = {
    plan: tier || planDetails?.id,
    modules,
    tier: tier || planDetails?.id,
    billingCycleMonths,
    seatCount: seatCount || extraSeats || 1,
  };

  const pay = async () => {
    setLoading(true);
    onError?.('');
    try {
      let res;
      if (paymentToken) {
        res = await billingApi.checkoutPublic({ paymentToken, ...entitlement });
      } else {
        res = await billingApi.checkout(entitlement);
      }

      const session = res.data.data;
      if (session?.provider !== 'razorpay') {
        throw new Error('Real payment gateway is not configured');
      }

      const payment = await openRazorpayCheckout(session);

      const confirmRes = await billingApi.confirmPayment({
        paymentToken,
        ...entitlement,
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      });
      const confirmData = confirmRes.data.data;
      if (confirmData.token) {
        onSuccess?.(confirmData.token, confirmData.user);
      } else {
        onSuccess?.(null, null);
      }
    } catch (err) {
      onError?.(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const totalLabel =
    sessionTotalLabel(planDetails, billingCycleMonths) ||
    planDetails?.priceLabel ||
    '';

  return (
    <div className="payment-step">
      <div className="payment-step-head">
        <span className="payment-step-badge">Almost there</span>
        <h2 className="payment-step-title">Complete your payment</h2>
        <p className="payment-step-sub">
          {(modules || []).join(' + ') || planDetails?.name} · {tier || planDetails?.id}
          {billingCycleMonths ? ` · ${billingCycleMonths} months` : ''}
          {seatCount ? ` · ${seatCount} seats` : ''}
          {totalLabel ? (
            <>
              {' — '}
              <strong>{totalLabel}</strong>
            </>
          ) : null}
        </p>
      </div>
      <p className="text-sm text-muted mb-4">
        Prepaid one-time Razorpay checkout (UPI, card, netbanking). Access renews when you pay again.
      </p>
      <button type="button" className="auth-submit" disabled={loading} onClick={pay}>
        {loading ? 'Processing…' : `Pay & activate`}
      </button>
    </div>
  );
}

function sessionTotalLabel(planDetails, months) {
  if (planDetails?.prepaidTotal != null) return formatInr(planDetails.prepaidTotal);
  if (planDetails?.price && months) return formatInr(planDetails.price * months);
  return null;
}
