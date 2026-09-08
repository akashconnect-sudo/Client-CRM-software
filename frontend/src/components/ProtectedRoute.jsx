import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessFeatureForUser } from '../utils/planAccess';
import LoadingSpinner from './LoadingSpinner';
import PlanLocked from '../pages/PlanLocked';

export default function ProtectedRoute({ children, adminOnly, requiredFeature }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <div className="min-h-screen bg-app"><LoadingSpinner className="min-h-screen" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (requiredFeature && !canAccessFeatureForUser(user, requiredFeature)) {
    return <PlanLocked feature={requiredFeature} />;
  }

  return children;
}
