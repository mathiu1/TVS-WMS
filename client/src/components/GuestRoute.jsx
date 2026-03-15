import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GuestRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === 'manager') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/unloading" replace />;
  }

  return children;
};

export default GuestRoute;
