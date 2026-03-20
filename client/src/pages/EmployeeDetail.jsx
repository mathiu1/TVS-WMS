import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI, analyticsAPI, unloadingAPI } from '../api/axios';
import {
  Users,
  Calendar,
  MapPin,
  Package,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  Mail,
  X,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCcw,
  Lock,
  Eye,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  Truck,
} from 'lucide-react';

const EmployeeDetail = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingRole, setPendingRole] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightbox, setLightbox] = useState({ 
    open: false, 
    images: [], 
    index: 0,
    zoom: 1,
    rotate: 0,
    position: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    touchStart: { x: 0, y: 0 }
  });

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId, filter]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const params = { filter, employeeId };
      if (filter === 'custom') {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      }
      const res = await analyticsAPI.getEmployeeReports(params);
      
      // Since we filtered by employeeId, it should be the first/only item in the array
      if (res.data.data && res.data.data.length > 0) {
        setEmployee(res.data.data[0]);
      } else {
        // Fallback if no activity found but we still want to show name (would require a separate profile API)
        // For now, if no activity, it might show empty
        setEmployee(null);
      }
    } catch (err) {
      toast.error('Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) {
      toast.error('Please select both start and end dates.');
      return;
    }
    fetchEmployeeData();
  };

  const handleRoleChangeRequest = (newRole) => {
    if (newRole === employee?.role) return;
    setPendingRole(newRole);
    setShowConfirmModal(true);
  };

  const confirmRoleChange = async () => {
    if (!employee?.employeeId || !pendingRole) return;
    
    setRoleUpdating(true);
    setShowConfirmModal(false);
    try {
      await authAPI.updateRole(employee.employeeId, pendingRole);
      toast.success(`Role updated to ${pendingRole} successfully!`);
      fetchEmployeeData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user role.');
    } finally {
      setRoleUpdating(false);
      setPendingRole(null);
    }
  };

  const handleDeleteUser = async () => {
    // Basic frontend check for self-deletion (backend also checks)
    const currentUser = JSON.parse(localStorage.getItem('wms_user'));
    if (currentUser?.id === employeeId) {
      toast.error('You cannot delete your own account.');
      setShowDeleteModal(false);
      return;
    }

    setIsDeleting(true);
    try {
      await authAPI.deleteUser(employeeId);
      toast.success('User account deactivated. Historical records preserved.');
      navigate('/employee-reports');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to deactivate user.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const openRecord = async (recordId) => {
    setRecordLoading(true);
    try {
      const res = await unloadingAPI.getById(recordId);
      setSelectedRecord(res.data.data);
    } catch (err) {
      toast.error('Failed to load record details.');
    } finally {
      setRecordLoading(false);
    }
  };

  const openLightbox = (images, index) => {
    setLightbox({ 
      open: true, 
      images, 
      index, 
      zoom: 1, 
      rotate: 0, 
      position: { x: 0, y: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 }
    });
  };
  const closeLightbox = () => setLightbox({ 
    open: false, 
    images: [], 
    index: 0, 
    zoom: 1, 
    rotate: 0,
    position: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 }
  });
  
  const lightboxPrev = () => setLightbox((p) => ({ 
    ...p, 
    index: (p.index - 1 + p.images.length) % p.images.length,
    zoom: 1,
    rotate: 0,
    position: { x: 0, y: 0 }
  }));
  
  const lightboxNext = () => setLightbox((p) => ({ 
    ...p, 
    index: (p.index + 1) % p.images.length,
    zoom: 1,
    rotate: 0,
    position: { x: 0, y: 0 }
  }));

  const handleDragStart = (e) => {
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    if (lightbox.zoom <= 1 && e.type === 'touchstart') {
      // Don't prevent default yet, we need to see if it's a click or swipe
    } else {
      // Zoomed in, moving the image
    }
    
    setLightbox(p => ({
      ...p,
      isDragging: true,
      touchStart: { x: clientX, y: clientY },
      dragStart: { 
        x: clientX - p.position.x, 
        y: clientY - p.position.y 
      }
    }));
  };

  const handleDragMove = (e) => {
    if (!lightbox.isDragging) return;
    
    // Always prevent default on touch to stop background scrolling/jumping
    if (e.type === 'touchmove') e.preventDefault();
    
    if (lightbox.zoom <= 1) return; // For zoom 1, we only care about handleDragEnd for swipe logic

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    setLightbox(p => ({
      ...p,
      position: {
        x: clientX - p.dragStart.x,
        y: clientY - p.dragStart.y
      }
    }));
  };

  const handleDragEnd = () => {
    setLightbox(p => ({ ...p, isDragging: false }));
  };

  const filterLabels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    custom: 'Custom Range',
    all: 'All Time',
  };

  if (loading && !employee) {
    return (
      <div className="loader-container">
        <div className="loader-spinner" />
        <p>Loading employee data...</p>
      </div>
    );
  }

  return (
    <div className="page-container dashboard-premium">
      <div className="records-section-header">
        <button className="btn-back" onClick={() => navigate('/employee-reports')}>
          <ArrowLeft size={18} />
          <span>Back to Team</span>
        </button>
      </div>

      <div className="premium-profile-card">
        <div className="profile-main-content">
          <div className="profile-avatar-v2">
            {(employee?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="profile-info-v2">
            <h1 className="profile-name-v2">{employee?.name || 'Unknown Employee'}</h1>
            <div className="profile-email-v2">
              <Mail size={16} />
              <span>{employee?.email || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions-v2">
          <div className="role-management">
            <div className="role-control-wrapper">
              <div className={`role-segments ${employee?.role || 'employee'}`}>
                <button 
                  type="button"
                  className={`role-segment-btn ${employee?.role === 'employee' ? 'active' : ''}`}
                  onClick={() => handleRoleChangeRequest('employee')}
                  disabled={roleUpdating || employee?.role === 'employee'}
                >
                  <Users size={14} />
                  <span>Employee</span>
                </button>
                <button 
                  type="button"
                  className={`role-segment-btn ${employee?.role === 'manager' ? 'active' : ''}`}
                  onClick={() => handleRoleChangeRequest('manager')}
                  disabled={roleUpdating || employee?.role === 'manager'}
                >
                  <Lock size={14} />
                  <span>Manager</span>
                </button>
                <div className="role-selection-slider" />
              </div>
            </div>
          </div>
          
          <button 
            className="btn btn-danger-soft btn-full" 
            onClick={() => setShowDeleteModal(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <ShieldAlert size={16} />
            <span>Deactivate Account</span>
          </button>
        </div>
      </div>

      {/* Employee Overview Stats - Upgraded to Premium v2 */}
      <div className="stats-grid-v2">
        <div className="stat-card-v2">
          <div className="card-top">
            <div className="icon-box gold">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Unloads</span>
            <span className="stat-value">{employee?.totalUnloads || 0}</span>
          </div>
        </div>

        <div className="stat-card-v2">
          <div className="card-top">
            <div className="icon-box dark">
              <Package size={18} />
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Parts</span>
            <span className="stat-value">{employee?.totalParts || 0}</span>
          </div>
        </div>

      </div>

      {/* Filter Section */}
      <div className="detail-filters-card">
        <div className="filter-tabs">
          {['today', 'week', 'month', 'all', 'custom'].map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {filter === 'custom' && (
          <div className="custom-date-range">
            <div className="filter-range">
              <div className="input-group">
                <Calendar size={16} className="input-icon" />
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <span className="range-separator">to</span>
              <div className="input-group">
                <Calendar size={16} className="input-icon" />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleCustomApply}>
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Activity Grid / Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>Unloading Activity ({employee?.records?.length || 0} Records)</h3>
          {employee?.lastActivity && (
            <span className="last-seen">
              <Clock size={12} /> Last active: {new Date(employee.lastActivity).toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {employee?.records?.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No activity found for this period.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vehicle</th>
                  <th>Vendors</th>
                  <th>Invoices</th>
                  <th>Parts</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                  {employee?.records?.map((rec, i) => (
                    <tr
                      key={rec._id}
                      className="clickable-row"
                      onClick={() => openRecord(rec._id)}
                    >
                      <td>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                          <Truck size={14} className="inline-icon" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: '600' }}>{rec.vehicleNumber}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-blue">{rec.vendorCount || 0}</span></td>
                    <td><span className="badge badge-blue">{rec.invoiceCount || 0}</span></td>
                    <td><span className="badge badge-blue">{rec.partsCount || 0}</span></td>
                    <td>
                      {new Date(rec.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lightbox & Modal (Same as Reports) */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content record-detail-modal" style={{ width: '95%', maxWidth: '850px', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedRecord(null)} style={{ top: '0.75rem', right: '0.75rem' }}>
              <X size={20} />
            </button>
            <h2 className="modal-title-responsive" style={{ color: 'var(--accent-blue)', marginBottom: '1.25rem', fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', paddingRight: '40px' }}>
              Vehicle {selectedRecord.vehicleNumber}
            </h2>
            
            <div className="modal-details-responsive" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <p style={{ margin: 0 }}><strong>Employee:</strong> {selectedRecord.employee?.name || 'mathi'}</p>
              <p style={{ margin: 0 }}><strong>Date:</strong> {new Date(selectedRecord.createdAt).toLocaleString('en-IN')}</p>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Vendors & Inventory
            </h3>
            
            <div className="table-wrapper">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>UNIQUE ID</th>
                    <th>VENDOR NAME</th>
                    <th>STORAGE LOCATION</th>
                    <th>INVOICES</th>
                    <th>PARTS COUNT</th>
                    <th>PHOTOS</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.vendors?.map((vendor, i) => (
                    <tr 
                      key={i} 
                      className="clickable-row" 
                      onClick={() => vendor.images?.length > 0 && openLightbox(vendor.images, 0)}
                    >
                      <td>{i + 1}</td>
                      <td>
                        <span className="badge badge-blue" style={{ borderRadius: '6px' }}>
                          {vendor.vendorId || '—'}
                        </span>
                      </td>
                      <td>{vendor.vendorName}</td>
                      <td>{vendor.storageLocation || '—'}</td>
                      <td>{vendor.invoiceCount}</td>
                      <td>{vendor.partsCount}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', minWidth: 'max-content' }}>
                          {vendor.images?.map((img, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={img}
                              alt={`Proof ${imgIdx + 1}`}
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                objectFit: 'cover', 
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border: '1px solid var(--glass-border)'
                              }}
                              onClick={() => openLightbox(vendor.images, imgIdx)}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {lightbox.open && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>
            <X size={24} />
          </button>
          <div className="lightbox-body" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-controls">
              <button onClick={() => setLightbox(p => ({ ...p, zoom: Math.min(p.zoom + 0.25, 3) }))} title="Zoom In">
                <ZoomIn size={20} />
              </button>
              <button onClick={() => setLightbox(p => ({ ...p, zoom: Math.max(p.zoom - 0.25, 0.5) }))} title="Zoom Out">
                <ZoomOut size={20} />
              </button>
              <button onClick={() => setLightbox(p => ({ ...p, rotate: (p.rotate + 90) % 360 }))} title="Rotate">
                <RotateCw size={20} />
              </button>
              <button onClick={() => setLightbox(p => ({ ...p, zoom: 1, rotate: 0, position: { x: 0, y: 0 } }))} title="Reset">
                <RefreshCcw size={20} />
              </button>
            </div>

            {lightbox.images.length > 1 && (
              <button className="lightbox-nav lightbox-prev" onClick={lightboxPrev}>
                <ChevronLeft size={28} />
              </button>
            )}

            <div 
              className="lightbox-image-container"
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              <img 
                src={lightbox.images[lightbox.index]} 
                alt="Proof" 
                className="lightbox-image" 
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{ 
                  transform: `translate(${lightbox.position.x}px, ${lightbox.position.y}px) scale(${lightbox.zoom}) rotate(${lightbox.rotate}deg)`,
                  transition: lightbox.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: lightbox.zoom > 1 ? (lightbox.isDragging ? 'grabbing' : 'grab') : 'default'
                }}
                draggable="false"
              />
            </div>

            {lightbox.images.length > 1 && (
              <button className="lightbox-nav lightbox-next" onClick={lightboxNext}>
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        </div>
      )}

      {recordLoading && (
        <div className="modal-overlay">
          <div className="loader-spinner" />
        </div>
      )}
      {/* Role Change Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content auth-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="summary-icon blue" style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Confirm Role Change</h2>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ margin: '1.5rem 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Change role to <span style={{ color: 'var(--accent-blue)', textTransform: 'capitalize' }}>{pendingRole}</span>?
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {pendingRole === 'manager' 
                  ? 'This user will gain full administrative access to all records and user management features.'
                  : 'This user will lose administrative access and will only be able to view their own records.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowConfirmModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={confirmRoleChange}
                style={{ flex: 1 }}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Safe User Deletion Modal */}
      {showDeleteModal && (
        <div className="modal-overlay danger">
          <div className="modal-content danger-modal">
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="summary-icon red" style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <ShieldAlert size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ef4444' }}>Deactivate Account</h2>
              </div>
              <button 
                className="modal-close" 
                onClick={() => setShowDeleteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body danger-content" style={{ marginBottom: '2rem' }}>
              <div className="warning-banner" style={{ background: 'rgba(59, 130, 246, 0.05)', borderLeft: '4px solid #3b82f6', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#3b82f6', marginBottom: '0.5rem', fontWeight: '700' }}>
                  <TrendingUp size={18} />
                  <span>DATA PRESERVATION ACTIVE</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                  Deactivating this user will block their login access. However, all historical unloading records will be <strong>preserved</strong> for reporting.
                </p>
              </div>
              <p style={{ fontSize: '1rem', color: 'var(--text-primary)', textAlign: 'center' }}>
                Are you sure you want to deactivate <strong>{employee?.name}</strong>?
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDeleteModal(false)}
                style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteUser}
                disabled={isDeleting}
                style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {isDeleting ? (
                  <RefreshCcw size={18} className="spin-slow" />
                ) : (
                  <>
                    <ShieldAlert size={18} />
                    Confirm Deactivate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDetail;
