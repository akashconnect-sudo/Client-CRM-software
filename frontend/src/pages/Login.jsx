import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import AuthMarketingPanel from '../components/auth/AuthMarketingPanel';
import AuthFormPanel from '../components/auth/AuthFormPanel';
import AuthFlowTabs from '../components/auth/AuthFlowTabs';
import OAuthButtons from '../components/auth/OAuthButtons';
import InlineEmailOtp from '../components/auth/InlineEmailOtp';
import PasswordStrengthMeter from '../components/auth/PasswordStrengthMeter';
import { normalizePhoneInput } from '../utils/phoneVerifySession';
import ModuleEntitlementPicker from '../components/billing/ModuleEntitlementPicker';
import PaymentStep from '../components/billing/PaymentStep';
import { IconEye, IconEyeOff } from '../components/auth/AuthIcons';
import { PAGE_SEO } from '../constants/marketingSeo';
import MarketingSEO from '../components/marketing/MarketingSEO';
import { checkPassword } from '../utils/passwordPolicy';
import { PACKAGE_META, computePrepaidTotal } from '../constants/modularPricing';

const REMEMBER_KEY = 'crm-remember-email';

function isTier(t) {
  return ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(t);
}

function EmailFieldWithOtp({
  email,
  onEmailChange,
  emailVerifyToken,
  onClearVerification,
  emailOtpSent,
  maskedEmail,
  loading,
  onRequestOtp,
  onVerifyOtp,
  onResendOtp,
  otpRequired,
}) {
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor="auth-email">
        Email
      </label>
      <input
        id="auth-email"
        type="email"
        className="auth-input"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        required
        autoComplete="email"
      />
      {otpRequired !== false && (
        <InlineEmailOtp
          email={email}
          verified={Boolean(emailVerifyToken)}
          maskedEmail={maskedEmail}
          loading={loading}
          otpSent={emailOtpSent}
          onRequestOtp={onRequestOtp}
          onVerify={onVerifyOtp}
          onResend={onResendOtp}
        />
      )}
      {emailVerifyToken && (
        <button
          type="button"
          className="auth-text-link text-xs mt-1"
          onClick={onClearVerification}
        >
          Change email
        </button>
      )}
    </div>
  );
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('SALES_EMPLOYEE');
  const [selectedPlan, setSelectedPlan] = useState('PROFESSIONAL');
  const [entitlement, setEntitlement] = useState(() => {
    const q = computePrepaidTotal({
      packageKey: 'COMBO',
      tier: 'PROFESSIONAL',
      billingCycleMonths: 6,
      desiredSeats: 5,
    });
    return {
      packageKey: 'COMBO',
      modules: q.modules,
      tier: 'PROFESSIONAL',
      billingCycleMonths: 6,
      desiredSeats: 5,
      seatCount: q.seatCount,
      extraSeats: q.extraSeats,
      quote: q,
    };
  });
  const [setup, setSetup] = useState({ canRegisterSuperAdmin: true, emailOtpRequired: true });
  const [workspaceMode, setWorkspaceMode] = useState('create');
  const [paymentSession, setPaymentSession] = useState(null);
  const [remember, setRemember] = useState(!!localStorage.getItem(REMEMBER_KEY));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState([]);
  const [challengeId, setChallengeId] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [emailVerifyToken, setEmailVerifyToken] = useState(null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const { login, setSessionFromToken } = useAuth();
  const navigate = useNavigate();
  const passwordOk = checkPassword(password).valid;
  const emailOtpRequired = setup.emailOtpRequired !== false;

  const resetEmailVerification = () => {
    setChallengeId(null);
    setMaskedEmail('');
    setEmailVerifyToken(null);
    setEmailOtpSent(false);
  };

  const resetAllVerification = () => {
    resetEmailVerification();
  };

  const onEmailChange = (value) => {
    setEmail(value);
    resetEmailVerification();
  };

  useEffect(() => {
    const oauthErr = searchParams.get('oauth_error');
    if (oauthErr) setError(decodeURIComponent(oauthErr));
    const modeParam = searchParams.get('mode');
    if (modeParam === 'register') setMode('register');
    const planParam = searchParams.get('plan');
    if (planParam && isTier(planParam)) {
      setSelectedPlan(planParam);
    }
    const packageParam = (searchParams.get('package') || '').toUpperCase();
    const tierParam = (searchParams.get('tier') || searchParams.get('plan') || '').toUpperCase();
    const cycleParam = parseInt(searchParams.get('cycle') || searchParams.get('months') || '', 10);
    const seatsParam = parseInt(searchParams.get('seats') || '', 10);
    const extraParam = parseInt(searchParams.get('extraSeats') || '', 10);
    if (
      PACKAGE_META[packageParam] ||
      isTier(tierParam) ||
      [3, 6, 12].includes(cycleParam) ||
      seatsParam ||
      extraParam
    ) {
      const packageKey = PACKAGE_META[packageParam] ? packageParam : 'COMBO';
      const tier = isTier(tierParam) ? tierParam : 'PROFESSIONAL';
      const billingCycleMonths = [3, 6, 12].includes(cycleParam) ? cycleParam : 6;
      const desiredSeats = seatsParam > 0 ? seatsParam : 5;
      const quote = computePrepaidTotal({
        packageKey,
        tier,
        billingCycleMonths,
        desiredSeats,
      });
      setEntitlement({
        packageKey,
        modules: quote.modules,
        tier,
        billingCycleMonths,
        desiredSeats,
        seatCount: quote.seatCount,
        extraSeats: quote.extraSeats,
        quote,
      });
      setSelectedPlan(tier);
    }
  }, [searchParams]);

  useEffect(() => {
    authApi.setupStatus().then((res) => setSetup(res.data.data)).catch(() => {});
    authApi.oauthProviders().then((res) => setOauthProviders(res.data.data || [])).catch(() => {});
  }, []);

  const sendEmailOtp = async () => {
    if (!email.trim()) {
      setError('Enter your email first');
      return false;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.sendEmailOtp({ email });
      const data = res.data.data;
      setChallengeId(data.challengeId);
      setMaskedEmail(data.maskedEmail);
      setEmailOtpSent(true);
      return true;
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.code === 'ERR_NETWORK' || !err.response
            ? 'Server is not reachable. Start the API (npm run dev:api) and try again.'
            : 'Could not send verification code')
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async (otp) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyEmailOtp({ email, otp, challengeId });
      setEmailVerifyToken(res.data.data.emailVerifyToken);
      setEmailOtpSent(false);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const completeRegister = async () => {
    const phoneNorm = normalizePhoneInput(phone);
    const isCreatingWorkspace = setup.canRegisterSuperAdmin || workspaceMode === 'create';
    const payload = {
      name,
      email,
      phone: phoneNorm,
      password,
      role: isCreatingWorkspace ? undefined : role,
      companyName: companyName || undefined,
      plan: isCreatingWorkspace ? entitlement.tier || selectedPlan : undefined,
      modules: isCreatingWorkspace ? entitlement.modules : undefined,
      tier: isCreatingWorkspace ? entitlement.tier : undefined,
      billingCycleMonths: isCreatingWorkspace ? entitlement.billingCycleMonths : undefined,
      seatCount: isCreatingWorkspace ? entitlement.seatCount || entitlement.desiredSeats : undefined,
      desiredSeats: isCreatingWorkspace ? entitlement.desiredSeats : undefined,
      extraSeats: isCreatingWorkspace ? entitlement.extraSeats || 0 : undefined,
      createWorkspace: isCreatingWorkspace,
      emailVerifyToken,
    };
    const res = await authApi.register(payload);
    const data = res.data.data;

    if (data?.needsPayment) {
      setPaymentSession({
        paymentToken: data.paymentToken,
        planDetails: data.planDetails,
        modules: entitlement.modules,
        tier: entitlement.tier,
        billingCycleMonths: entitlement.billingCycleMonths,
        seatCount: entitlement.seatCount || entitlement.desiredSeats,
        extraSeats: entitlement.extraSeats || 0,
      });
      return;
    }

    localStorage.setItem('token', data.token);
    await setSessionFromToken(data.token);
    navigate('/dashboard');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (emailOtpRequired && !emailVerifyToken) {
      setError('Verify your email with OTP first');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
      await login({ email, password, companyName, emailVerifyToken });
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'PAYMENT_REQUIRED' && data?.data?.paymentToken) {
        setPaymentSession({
          paymentToken: data.data.paymentToken,
          planDetails: data.data.planDetails,
        });
        setError('');
      } else {
        setError(data?.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (emailOtpRequired && !emailVerifyToken) {
      setError('Verify your email with OTP first');
      return;
    }
    const phoneNorm = normalizePhoneInput(phone);
    if (!phoneNorm || phoneNorm.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!passwordOk) {
      setError('Password must meet all requirements below');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await completeRegister();
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'PAYMENT_REQUIRED' && data?.data?.paymentToken) {
        setPaymentSession({
          paymentToken: data.data.paymentToken,
          planDetails: data.data.planDetails,
        });
        setError('');
        return;
      }
      setError(data?.message || data?.errors?.[0] || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const onPaymentSuccess = async (token) => {
    if (token) {
      await setSessionFromToken(token);
      navigate('/dashboard');
    } else {
      setMode('signin');
      setPaymentSession(null);
      setError('');
      resetAllVerification();
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    resetAllVerification();
  };

  const canSubmitSignIn = !emailOtpRequired || emailVerifyToken;
  const canSubmitRegister =
    (!emailOtpRequired || emailVerifyToken) && passwordOk;

  if (paymentSession) {
    return (
      <div className="auth-page min-h-screen min-h-[100dvh] flex flex-col lg:flex-row">
        <AuthFormPanel showBrandText={false}>
          <div className="auth-form-card">
            <p className="auth-form-kicker">Checkout</p>
            <h1 className="auth-form-title">Complete your plan</h1>
            <p className="auth-form-subtitle">One step to unlock your workspace.</p>
            <PaymentStep
              paymentToken={paymentSession.paymentToken}
              planDetails={paymentSession.planDetails}
              modules={paymentSession.modules}
              tier={paymentSession.tier}
              billingCycleMonths={paymentSession.billingCycleMonths}
              seatCount={paymentSession.seatCount}
              extraSeats={paymentSession.extraSeats}
              onSuccess={onPaymentSuccess}
              onError={setError}
            />
            {error && <div className="auth-form-error mt-4">{error}</div>}
          </div>
        </AuthFormPanel>
        <AuthMarketingPanel onGetStarted={() => setMode('register')} />
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen min-h-[100dvh] flex flex-col lg:flex-row">
      <MarketingSEO {...PAGE_SEO.login} />
      <AuthFormPanel>
        <div className="auth-form-card">
          <AuthFlowTabs mode={mode} onChange={switchMode} />

          <p className="auth-form-kicker mt-6">
            {mode === 'signin' ? 'Workspace access' : 'New workspace'}
          </p>
          <h1 className="auth-form-title">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="auth-form-subtitle">
            {mode === 'signin'
              ? 'Sign in with your email and password.'
              : setup.canRegisterSuperAdmin
                ? `${setup.trialDays || 10}-day free trial. Tell us your team size — pay only when the trial ends.`
                : 'Join your team workspace.'}
          </p>

          {error && (
            <div className="auth-form-error mt-5" role="alert">
              {error}
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="auth-form-fields mt-6">
              <EmailFieldWithOtp
                email={email}
                onEmailChange={onEmailChange}
                emailVerifyToken={emailVerifyToken}
                onClearVerification={resetEmailVerification}
                emailOtpSent={emailOtpSent}
                maskedEmail={maskedEmail}
                loading={loading}
                onRequestOtp={sendEmailOtp}
                onVerifyOtp={verifyEmailOtp}
                onResendOtp={sendEmailOtp}
                otpRequired={emailOtpRequired}
              />

              <div className="auth-field">
                <label className="auth-label" htmlFor="companyName">
                  Workspace name
                </label>
                <input
                  id="companyName"
                  className="auth-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Optional if you have one workspace"
                  autoComplete="organization"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="password">
                  Password
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input auth-input-padded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-input-action"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide' : 'Show'}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <label className="auth-remember">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember email</span>
              </label>

              <button
                type="submit"
                className="auth-submit"
                disabled={loading || !canSubmitSignIn}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <OAuthButtons providers={oauthProviders} disabled={loading} />
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="auth-form-fields auth-form-fields-tight mt-6">
              {!setup.canRegisterSuperAdmin && (
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    className={`auth-submit ${workspaceMode === 'create' ? '' : 'opacity-70'}`}
                    onClick={() => setWorkspaceMode('create')}
                  >
                    Create new workspace
                  </button>
                  <button
                    type="button"
                    className={`auth-submit ${workspaceMode === 'join' ? '' : 'opacity-70'}`}
                    onClick={() => setWorkspaceMode('join')}
                  >
                    Join existing workspace
                  </button>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Company / workspace name</label>
                <input
                  className="auth-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder={
                    setup.canRegisterSuperAdmin
                      ? 'Your business name'
                      : 'Enter the workspace name'
                  }
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Full name</label>
                <input
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <EmailFieldWithOtp
                email={email}
                onEmailChange={onEmailChange}
                emailVerifyToken={emailVerifyToken}
                onClearVerification={resetEmailVerification}
                emailOtpSent={emailOtpSent}
                maskedEmail={maskedEmail}
                loading={loading}
                onRequestOtp={sendEmailOtp}
                onVerifyOtp={verifyEmailOtp}
                onResendOtp={sendEmailOtp}
                otpRequired={emailOtpRequired}
              />

              <div className="auth-field">
                <label className="auth-label">Mobile number</label>
                <input
                  className="auth-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile (contact only)"
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  maxLength={12}
                  required
                  autoComplete="new-password"
                />
                <PasswordStrengthMeter password={password} />
              </div>

              {(setup.canRegisterSuperAdmin || workspaceMode === 'create') && (
                <ModuleEntitlementPicker
                  value={entitlement}
                  onChange={(next) => {
                    setEntitlement(next);
                    setSelectedPlan(next.tier);
                  }}
                />
              )}

              {workspaceMode === 'join' && !setup.canRegisterSuperAdmin && (
                <div className="auth-field">
                  <label className="auth-label">Role</label>
                  <select
                    className="auth-input auth-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="SALES_EMPLOYEE">Sales Employee</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading || !canSubmitRegister}
              >
                {loading
                  ? 'Please wait…'
                  : setup.canRegisterSuperAdmin || workspaceMode === 'create'
                    ? 'Start free trial'
                    : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </AuthFormPanel>

      <AuthMarketingPanel onGetStarted={() => switchMode('register')} />
    </div>
  );
}
