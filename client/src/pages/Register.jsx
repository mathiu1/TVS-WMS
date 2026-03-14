import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await register(form.name, form.email, form.password, form.role);
      toast.success(`Account created! Welcome, ${user.name}!`);

      if (user.role === 'manager') {
        navigate('/dashboard');
      } else {
        navigate('/unloading');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-icon">
            <UserPlus size={28} />
          </div>
          <h1>Create Account</h1>
          <p>Join TVS Warehouse Management</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input
              id="register-name"
              type="text"
              name="name"
              placeholder="Full name"
              value={form.name}
              onChange={handleChange}
              required
              minLength={2}
            />
          </div>

          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              id="register-email"
              type="email"
              name="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <Lock size={18} className="input-icon" />
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password (min 6 characters)"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="input-group">
            <Shield size={18} className="input-icon" />
            <select
              id="register-role"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager / Supervisor</option>
            </select>
          </div>

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">Creating account...</span>
            ) : (
              <>
                <UserPlus size={18} />
                Create Account
              </>
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
