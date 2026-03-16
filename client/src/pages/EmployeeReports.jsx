import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../api/axios';
import {
  Users,
  MapPin,
  TrendingUp,
  Mail,
  Search,
  Package,
  ArrowRight,
  UserPlus,
  X,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../api/axios';

const EmployeeReports = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getEmployeeReports({ filter: 'all' });
      setEmployees(res.data.data);
    } catch (err) {
      toast.error('Failed to load employee list.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authAPI.register(form);
      toast.success('User added successfully!');
      setShowAddModal(false);
      setForm({ name: '', email: '', password: '', role: 'employee' });
      fetchEmployees(); // Refresh the list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalUnloads = employees.reduce((sum, emp) => sum + emp.totalUnloads, 0);
  const totalParts = employees.reduce((sum, emp) => sum + emp.totalParts, 0);

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && employees.length === 0) {
    return (
      <div className="loader-container">
        <div className="loader-spinner" />
        <p>Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-title-container">
          <div className="summary-icon blue">
            <Users size={24} />
          </div>
          <div className="header-text">
            <h1>Employees List</h1>
            <p>Browse team members and view reports</p>
          </div>
        </div>
        <button 
          className="btn btn-primary add-user-btn"
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={18} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Global Search */}
      <div className="report-filters-container">
        <div className="employee-search">
          <div className="input-group">
            <Search size={16} className="input-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Overview Stats - Upgraded to Premium v2 */}
      <div className="stats-grid-v2">
        <div className="stat-card-v2">
          <div className="card-top">
            <div className="icon-box gold">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{employees.length}</span>
          </div>
        </div>

        <div className="stat-card-v2">
          <div className="card-top">
            <div className="icon-box dark">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Site Unloads</span>
            <span className="stat-value">{totalUnloads}</span>
          </div>
        </div>

        <div className="stat-card-v2">
          <div className="card-top">
            <div className="icon-box gold">
              <Package size={18} />
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Site Parts</span>
            <span className="stat-value">{totalParts}</span>
          </div>
        </div>
      </div>

      {/* Employee Grid / List */}
      {filteredEmployees.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>{searchTerm ? `No employees matching "${searchTerm}" found.` : 'No employee records available.'}</p>
        </div>
      ) : (
        <div className="employee-list">
          {filteredEmployees.map((emp) => (
            <div 
              key={emp.employeeId} 
              className="employee-report-card clickable"
              onClick={() => navigate(`/employee-reports/${emp.employeeId}`)}
            >
              <div className="employee-card-header">
                <div className="employee-info">
                  <div className="employee-avatar">
                    {emp.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="employee-details">
                    <div className="employee-name-row">
                      <h3>{emp.name}</h3>
                      <span className={`role-badge ${emp.role || 'employee'}`}>
                        {emp.role || 'employee'}
                      </span>
                    </div>
                    <span className="employee-email">
                      <Mail size={12} /> {emp.email}
                    </span>
                  </div>
                </div>

                <div className="employee-stats hide-mobile">
                  <div className="stat-pill blue">
                    <span>{emp.totalUnloads} unloads</span>
                  </div>
                  <div className="stat-pill green">
                    <span>{emp.totalParts} parts</span>
                  </div>
                </div>

                <div className="navigation-hint">
                  <span>View Details</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content auth-modal">
            <div className="modal-header">
              <div className="header-title-container">
                <div className="summary-icon blue">
                  <UserPlus size={20} />
                </div>
                <h2 className="modal-title">Add New User</h2>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowAddModal(false)}
                disabled={isSubmitting}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="auth-form">
              <div className="input-group">
                <Users size={18} className="input-icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="input-group">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="input-group" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="input-group">
                <Users size={18} className="input-icon" />
                <select
                  name="role"
                  value={form.role}
                  onChange={handleInputChange}
                  className="role-select"
                  style={{ 
                    width: '100%', 
                    padding: '0.7rem 0.7rem 0.7rem 2.8rem', 
                    height: '48px', 
                    borderRadius: '10px', 
                    border: '1px solid var(--glass-border)', 
                    background: 'transparent',
                    appearance: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="employee">Employee Account</option>
                  <option value="manager">Manager Account</option>
                </select>
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                  <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={isSubmitting}
                style={{ marginTop: '1rem' }}
              >
                {isSubmitting ? 'Adding User...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeReports;
