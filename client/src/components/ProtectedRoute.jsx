import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to the appropriate dashboard based on role
    if (user?.role === 'manager') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/unloading" replace />;
  }

  return children;
};

export default ProtectedRoute;
