import { Warehouse, Truck, Loader2 } from 'lucide-react';

/**
 * ModernLoader Component - Truck & Forklift Evolution
 * Provides a thematic unloading story featuring a source vehicle.
 */
const ModernLoader = ({ message = "Unloading cargo...", fullPage = false, variant = 'default' }) => {
  if (variant === 'card') {
    return (
      <div className="skeleton-card-loading">
        <div className="skeleton-shimmer" style={{ width: '60%', height: '14px', marginBottom: '8px' }}></div>
        <div className="skeleton-shimmer" style={{ width: '40%', height: '24px', borderRadius: '8px' }}></div>
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className="skeleton-chart-placeholder">
        <div className="skeleton-bar-row">
          {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
            <div key={i} className="skeleton-bar skeleton-shimmer" style={{ height: `${h}%` }}></div>
          ))}
        </div>
        <div className="modern-loader-content" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', gap: '0.5rem' }}>
          <Loader2 className="loader-icon-spin" size={24} />
          <span className="loader-text-modern" style={{ fontSize: '0.75rem' }}>Optimizing logistics...</span>
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="modern-loader-content" style={{ gap: '0.5rem' }}>
        <Loader2 className="loader-icon-spin" size={28} />
        {message && <span className="loader-text-modern" style={{ fontSize: '0.9rem' }}>{message}</span>}
      </div>
    );
  }

  if (variant === 'table-skeleton') {
    return (
      <div className="table-skeleton-container" style={{ width: '100%', padding: '0.5rem 0' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-cell skeleton-shimmer" style={{ width: '15%' }}></div>
            <div className="skeleton-cell skeleton-shimmer" style={{ width: '25%' }}></div>
            <div className="skeleton-cell skeleton-shimmer" style={{ width: '20%' }}></div>
            <div className="skeleton-cell skeleton-shimmer" style={{ width: '10%' }}></div>
            <div className="skeleton-cell skeleton-shimmer" style={{ width: '10%' }}></div>
            <div className="skeleton-cell skeleton-shimmer" style={{ width: '20%' }}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`modern-loader-container ${fullPage ? 'full-page' : ''}`}>
      <div className="modern-loader-content">
        <div className="professional-loader-container">
          <div className="loader-orbit-ring ring-outer"></div>
          <div className="loader-orbit-ring ring-inner"></div>
          <div className="loader-center-icon">
            <Truck size={36} />
          </div>
        </div>
        {message && <p className="loader-text-modern">{message}</p>}
      </div>
    </div>
  );
};

export default ModernLoader;
