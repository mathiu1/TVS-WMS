import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Warehouse,
  LayoutDashboard,
  PackagePlus,
  ClipboardList,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const Sidebar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  const employeeLinks = [
    { to: '/unloading', icon: PackagePlus, label: 'Unloading' },
    { to: '/records', icon: ClipboardList, label: 'Records' },
  ];

  const managerLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/records', icon: ClipboardList, label: 'Records' },
    { to: '/employee-reports', icon: Users, label: 'Employee Reports' },
  ];

  const links = user?.role === 'manager' ? managerLinks : employeeLinks;

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Warehouse size={22} className="sidebar-brand-icon" />
            {!collapsed && <span>TVS <strong>WMS</strong></span>}
          </div>
          {/* Desktop collapse toggle */}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          {/* Mobile close */}
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <link.icon size={20} className="sidebar-link-icon" />
              {!collapsed && <span className="sidebar-link-text">{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section at bottom */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.name}</span>
                <span className={`role-tag ${user?.role}`}>{user?.role}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-logout"
            title="Logout"
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
