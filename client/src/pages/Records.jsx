import { useState, useEffect } from 'react';
import { unloadingAPI } from '../api/axios';
import {
  ClipboardList,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  FileText,
  Edit,
  Trash2,
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCcw,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import UnloadingForm from './UnloadingForm';

const Records = ({ scope = 'all', title = 'Unloading Reports' }) => {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeScope, setActiveScope] = useState(scope);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState(null);
  const [lightbox, setLightbox] = useState({ 
    open: false, 
    images: [], 
    index: 0,
    zoom: 1,
    rotate: 0,
    position: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    touchStart: { x: 0, y: 0 } // Add for swipe detection
  });
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

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

  const closeLightbox = () => {
    setLightbox({ open: false, images: [], index: 0 });
  };

  const lightboxPrev = () => {
    setLightbox((prev) => ({
      ...prev,
      index: (prev.index - 1 + prev.images.length) % prev.images.length,
      zoom: 1,
      rotate: 0,
      position: { x: 0, y: 0 }
    }));
  };

  const lightboxNext = () => {
    setLightbox((prev) => ({
      ...prev,
      index: (prev.index + 1) % prev.images.length,
      zoom: 1,
      rotate: 0,
      position: { x: 0, y: 0 }
    }));
  };

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

  const handleDragEnd = (e) => {
    if (lightbox.zoom <= 1 && e.type === 'touchend') {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = lightbox.touchStart.x - touchEndX;
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) lightboxNext();
        else lightboxPrev();
      }
    }
    setLightbox(p => ({ ...p, isDragging: false }));
  };

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [startDate, endDate, searchFilter, pagination.page, activeScope]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await unloadingAPI.getStats({ scope: activeScope });
      setStats(res.data.stats);
    } catch (err) {
      console.error('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 15, scope: activeScope };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchFilter) params.vehicleNumber = searchFilter;

      const res = await unloadingAPI.getAll(params);
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load records.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleDelete = (id) => {
    setDeleteConfirmRecord(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmRecord) return;
    try {
      await unloadingAPI.delete(deleteConfirmRecord);
      toast.success('Record deleted successfully');
      setRecords(records.filter((r) => r._id !== deleteConfirmRecord));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record');
    } finally {
      setDeleteConfirmRecord(null);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await unloadingAPI.update(editRecord._id, {
        vehicleNumber: editRecord.vehicleNumber,
        locationName: editRecord.locationName,
      });
      toast.success('Record updated successfully');
      setRecords(records.map((r) => (r._id === editRecord._id ? res.data.data : r)));
      setEditRecord(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update record');
    }
  };

  const handleEditSuccess = () => {
    setEditRecord(null);
    fetchRecords();
    fetchStats();
  };

  const setQuickFilter = (type) => {
    const now = new Date();
    let start, end;
    
    switch (type) {
      case 'today':
        start = new Date(now);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        return;
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  // Removed top-level loading check to prevent search input from losing focus

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-title-container">
          <div className="summary-icon blue">
            <ClipboardList size={28} />
          </div>
          <div className="header-text">
            <h1>{title}</h1>
            <p>{activeScope === 'mine' ? 'Reviewing your personal unloading contributions' : 'Browse overall unloading records with proof images'}</p>
          </div>
        </div>

        {/* Scope Toggle - New Option */}
        <div className="view-toggle-modern">
          <button 
            className={`toggle-btn ${activeScope === 'all' ? 'active' : ''}`}
            onClick={() => {
              setActiveScope('all');
              setPagination(p => ({ ...p, page: 1 }));
            }}
          >
            All Reports
          </button>
          <button 
            className={`toggle-btn ${activeScope === 'mine' ? 'active' : ''}`}
            onClick={() => {
              setActiveScope('mine');
              setPagination(p => ({ ...p, page: 1 }));
            }}
          >
            My Reports
          </button>
        </div>
      </div>

      {/* Stats Cards - Now visible when My Records is active */}
      {activeScope === 'mine' && (
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-icon today"><Calendar size={20} /></div>
            <div className="stats-info">
              <span className="stats-label">Today</span>
              <h3 className="stats-value">{statsLoading ? '-' : stats.today}</h3>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-icon week"><Calendar size={20} /></div>
            <div className="stats-info">
              <span className="stats-label">This Week</span>
              <h3 className="stats-value">{statsLoading ? '-' : stats.week}</h3>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-icon month"><Calendar size={20} /></div>
            <div className="stats-info">
              <span className="stats-label">This Month</span>
              <h3 className="stats-value">{statsLoading ? '-' : stats.month}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-container">
        <div className="filter-main">
          <div className="input-group filter-search">
            <Search size={18} className="input-icon" />
            <input
              id="search-vehicle"
              type="text"
              placeholder="Search by vehicle, vendor, employee or unique id..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
          </div>

          <div className="filter-quick-date">
            <button 
              className={`btn-tag ${startDate === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
              onClick={() => setQuickFilter('today')}
            >
              Today
            </button>
            <button className="btn-tag" onClick={() => setQuickFilter('week')}>Week</button>
            <button className="btn-tag" onClick={() => setQuickFilter('month')}>Month</button>
          </div>
        </div>

        <div className="filter-secondary">
          <div className="filter-range">
            <div className="input-group filter-date">
              <Calendar size={18} className="input-icon" />
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
            </div>
            <span className="range-separator">to</span>
            <div className="input-group filter-date">
              <Calendar size={18} className="input-icon" />
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
            </div>
          </div>


          {(startDate || endDate || searchFilter) && (
            <button 
              className="btn-clear-filters"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchFilter('');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              Clear Filters
            </button>
          )}

          <span className="records-count">{pagination.total} records</span>
        </div>
      </div>

      {/* Records Table Spinner/Empty State */}
      {(loading && records.length === 0) ? (
        <div className="loader-container" style={{ minHeight: '300px' }}>
          <div className="loader-spinner" />
          <p>Loading records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <p>No records found.</p>
        </div>
      ) : (
        <>
          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table records-table">
                <thead>
                  {scope === 'all' ? (
                    <tr>
                      <th>Unique ID</th>
                      <th>Vendor Name</th>
                      <th>Location</th>
                      <th>Employee</th>
                      <th>Invoices</th>
                      <th>Parts</th>
                      <th>Images</th>
                      <th>Date</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Vehicle</th>
                      {scope !== 'me' && <th>Location</th>}
                      {scope !== 'me' && <th>Employee</th>}
                      <th>Vendors</th>
                      <th>Images</th>
                      <th>Date</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {records.map((record) => {
                    if (scope === 'all') {
                      return record.vendors?.map((vendor, vIdx) => (
                        <tr 
                          key={`${record._id}-${vIdx}`} 
                          className="clickable-row" 
                          onClick={() => setSelectedRecord(record)}
                          title="Click to view full record"
                        >
                          <td data-label="Unique ID">
                            <span className="vendor-id-badge-inline" style={{ margin: 0 }}>
                              {vendor.vendorId || '—'}
                            </span>
                          </td>
                          <td data-label="Vendor Name">{vendor.vendorName || '—'}</td>
                          <td data-label="Location">
                            <span className="record-location-cell">
                              <MapPin size={13} />
                              {vendor.storageLocation || '—'}
                            </span>
                          </td>
                          <td data-label="Employee">{record.employee?.name || 'N/A'}</td>
                          <td data-label="Invoices">
                            <span className="badge badge-blue">{vendor.invoiceCount || 0}</span>
                          </td>
                          <td data-label="Parts">
                            <span className="badge badge-blue">{vendor.partsCount || 0}</span>
                          </td>
                          <td data-label="Images">
                            {(vendor.images?.length || 0) > 0 ? (
                              <span className="badge badge-img-count">
                                {vendor.images.length}
                              </span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                          <td data-label="Date">
                            <span className="record-date-cell">
                              {new Date(record.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </td>
                        </tr>
                      ));
                    }

                    // Original row for 'My Records' or others
                    return (
                      <tr 
                        key={record._id} 
                        className="clickable-row" 
                        onClick={() => setSelectedRecord(record)}
                        title="Click to view full record"
                      >
                        <td data-label="Vehicle">
                          <span className="record-invoice-cell">
                            <Truck size={14} />
                            {record.vehicleNumber}
                          </span>
                        </td>
                        {scope !== 'me' && (
                           <td data-label="Location">
                            <span className="record-location-cell">
                              <MapPin size={13} />
                              {record.locationName || 'Main Gate'}
                            </span>
                          </td>
                        )}
                        {scope !== 'me' && <td data-label="Employee">{record.employee?.name || 'N/A'}</td>}
                        <td data-label="Vendors">
                          <span className="badge badge-blue">{record.vendors?.length || 0}</span>
                        </td>
                        <td data-label="Images">
                          {(() => {
                            const totalImgs = record.vendors?.reduce((sum, v) => sum + (v.images?.length || 0), 0) || 0;
                            return totalImgs > 0 ? (
                              <span
                                className="badge badge-img-count"
                                onClick={() => setSelectedRecord(record)}
                                title="View images"
                              >
                                {totalImgs}
                              </span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>—</span>
                            );
                          })()}
                        </td>
                        <td data-label="Date">
                          <span className="record-date-cell">
                            {new Date(record.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn btn-sm btn-secondary pagination-btn-prevnext"
              >
                <ChevronLeft size={16} /> <span className="hide-mobile">Prev</span>
              </button>
              
              <div className="pagination-numbers">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter(p => {
                    // Show current page, and up to 2 pages before and after
                    // to keep a maximum of 5 buttons (including first/last if logic allows)
                    if (pagination.pages <= 5) return true;
                    if (p === 1 || p === pagination.pages) return true;
                    if (Math.abs(p - pagination.page) <= 1) return true;
                    return false;
                  })
                  .map((p, idx, arr) => {
                    const elements = [];
                    if (idx > 0 && arr[idx - 1] !== p - 1) {
                      elements.push(<span key={`ellipsis-${p}`} className="pagination-ellipsis">...</span>);
                    }
                    elements.push(
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`pagination-number ${pagination.page === p ? 'active' : ''}`}
                      >
                        {p}
                      </button>
                    );
                    return elements;
                  })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="btn btn-sm btn-secondary pagination-btn-prevnext"
              >
                <span className="hide-mobile">Next</span> <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editRecord && (
        <div className="modal-overlay" onClick={() => setEditRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Record {editRecord.vehicleNumber}</h3>
              <button className="btn-icon" onClick={() => setEditRecord(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <UnloadingForm editData={editRecord} onSuccess={handleEditSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmRecord && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0, justifyContent: 'center' }}>
              <button className="btn-icon" onClick={() => setDeleteConfirmRecord(null)} style={{ position: 'absolute', right: '1rem', top: '1rem' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <Trash2 size={48} color="#ef4444" style={{ margin: '0 auto', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Delete Record</h3>
                <p style={{ color: '#64748b' }}>Are you sure you want to delete this record? This action cannot be undone.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setDeleteConfirmRecord(null)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                  style={{ flex: 1 }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedRecord(null)}>
              <X size={20} />
            </button>

            <h2>Vehicle {selectedRecord.vehicleNumber}</h2>
            <div className="modal-details">
              <p><strong>Unloading Agent:</strong> {selectedRecord.employee?.name}</p>
              <p><strong>Date:</strong> {new Date(selectedRecord.createdAt).toLocaleString('en-IN')}</p>
            </div>

            {scope === 'me' && (
              <div className="modal-actions-row" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedRecord(null); // Close detail modal
                    setEditRecord(selectedRecord); 
                  }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Edit size={14} /> Edit Record
                </button>
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedRecord(null); // Close detail modal
                    handleDelete(selectedRecord._id); 
                  }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Trash2 size={14} /> Delete Record
                </button>
              </div>
            )}

            <h3>Vendors & Inventory</h3>
            <div className="table-wrapper">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Unique ID</th>
                    <th>Vendor Name</th>
                    <th>Storage Location</th>
                    <th>Invoices</th>
                    <th>Parts Count</th>
                    <th>Photos</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.vendors?.map((v, i) => (
                    <tr 
                      key={i} 
                      className={v.images?.length > 0 ? "clickable-row" : ""} 
                      onClick={() => v.images?.length > 0 && openLightbox(v.images, 0)}
                      title={v.images?.length > 0 ? "Click to view images" : ""}
                    >
                      <td>{i + 1}</td>
                      <td>
                        {v.vendorId ? (
                          <span className="vendor-id-badge-inline" style={{ margin: 0 }}>
                            {v.vendorId}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{v.vendorName || '—'}</td>
                      <td>{v.storageLocation || '—'}</td>
                      <td>{v.invoiceCount}</td>
                      <td>{v.partsCount}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {v.images?.map((img, imgIdx) => (
                            <img 
                              key={imgIdx}
                              src={img} 
                              alt="Proof"
                              className="table-thumb"
                              onClick={() => openLightbox([img], 0)}
                              style={{ width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', objectFit: 'cover' }}
                            />
                          ))}
                          {(!v.images || v.images.length === 0) && <span style={{ color: '#94a3b8' }}>No Photos</span>}
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

      {/* Image Lightbox */}
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
                alt={`Proof ${lightbox.index + 1}`}
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

          {lightbox.images.length > 1 && (
            <span className="lightbox-counter">
              {lightbox.index + 1} / {lightbox.images.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Records;
