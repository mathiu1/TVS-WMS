import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Warehouse, LayoutDashboard, PackagePlus } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <Warehouse size={24} />
          <span>TVS <strong>WMS</strong></span>
        </Link>

        <div className="navbar-links">
          {user?.role === 'employee' && (
            <Link to="/unloading" className="nav-link">
              <PackagePlus size={18} />
              <span>Unloading</span>
            </Link>
          )}
          {user?.role === 'manager' && (
            <>
              <Link to="/dashboard" className="nav-link">
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
              <Link to="/records" className="nav-link">
                <PackagePlus size={18} />
                <span>Records</span>
              </Link>
            </>
          )}
        </div>

        <div className="navbar-user">
          <div className="user-badge">
            <span className="user-name">{user?.name}</span>
            <span className={`role-tag ${user?.role}`}>{user?.role}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
