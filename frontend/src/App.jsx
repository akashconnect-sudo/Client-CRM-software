import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import FeaturesPage from './pages/marketing/FeaturesPage';
import ModulesPage from './pages/marketing/ModulesPage';
import PricingPage from './pages/marketing/PricingPage';
import FaqPage from './pages/marketing/FaqPage';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Employees from './pages/Employees';
import EmployeePerformance from './pages/EmployeePerformance';
import CallHistory from './pages/CallHistory';
import FollowUps from './pages/FollowUps';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Allocations from './pages/desk/Allocations';
import Interactions from './pages/desk/Interactions';
import GmailInbox from './pages/desk/GmailInbox';
import FollowUpCalendar from './pages/desk/FollowUpCalendar';
import RecurringFollowUps from './pages/desk/RecurringFollowUps';
import RechurnCustomers from './pages/desk/RechurnCustomers';
import Analytics from './pages/desk/Analytics';
import MessageTemplates from './pages/desk/MessageTemplates';
import PlanLocked from './pages/PlanLocked';
import BillingSuccess from './pages/BillingSuccess';
import BillingCancel from './pages/BillingCancel';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner className="min-h-screen" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner className="min-h-screen" />;

  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/modules" element={<ModulesPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="allocations" element={<ProtectedRoute adminOnly requiredFeature="allocations"><Allocations /></ProtectedRoute>} />
        <Route path="leads" element={<ProtectedRoute requiredFeature="leads"><Leads /></ProtectedRoute>} />
        <Route path="leads/:id" element={<ProtectedRoute requiredFeature="leads"><LeadDetail /></ProtectedRoute>} />
        <Route path="interactions" element={<ProtectedRoute requiredFeature="interactions"><Interactions /></ProtectedRoute>} />
        <Route path="inbox/gmail" element={<ProtectedRoute requiredFeature="gmailInbox"><GmailInbox /></ProtectedRoute>} />
        <Route path="employees" element={<ProtectedRoute adminOnly requiredFeature="employees"><Employees /></ProtectedRoute>} />
        <Route path="employees/:id/performance" element={<ProtectedRoute adminOnly requiredFeature="employees"><EmployeePerformance /></ProtectedRoute>} />
        <Route path="calls" element={<ProtectedRoute requiredFeature="callBridge"><CallHistory /></ProtectedRoute>} />
        <Route path="follow-ups" element={<ProtectedRoute requiredFeature="follow-ups"><FollowUps /></ProtectedRoute>} />
        <Route path="calendar" element={<ProtectedRoute requiredFeature="calendar"><FollowUpCalendar /></ProtectedRoute>} />
        <Route path="recurring-follow-ups" element={<ProtectedRoute requiredFeature="recurringFollowUps"><RecurringFollowUps /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute adminOnly requiredFeature="reports"><Reports /></ProtectedRoute>} />
        <Route path="rechurn" element={<ProtectedRoute requiredFeature="rechurn"><RechurnCustomers /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute adminOnly requiredFeature="analytics"><Analytics /></ProtectedRoute>} />
        <Route path="templates/whatsapp" element={<ProtectedRoute requiredFeature="whatsappTemplates"><MessageTemplates channel="whatsapp" /></ProtectedRoute>} />
        <Route path="templates/email" element={<ProtectedRoute requiredFeature="emailTemplates"><MessageTemplates channel="email" /></ProtectedRoute>} />
        <Route path="locked" element={<PlanLocked />} />
        <Route path="settings" element={<ProtectedRoute adminOnly requiredFeature="settings"><Settings /></ProtectedRoute>} />
      </Route>
      <Route path="billing/success" element={<BillingSuccess />} />
      <Route path="billing/cancel" element={<BillingCancel />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
