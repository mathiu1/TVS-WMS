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
} from 'lucide-react';
import toast from 'react-hot-toast';
import UnloadingForm from './UnloadingForm';

const Records = ({ scope = 'all', title = 'Unloading Records' }) => {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState(null);
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const openLightbox = (images, index) => {
    setLightbox({ open: true, images, index });
  };

  const closeLightbox = () => {
    setLightbox({ open: false, images: [], index: 0 });
  };

  const lightboxPrev = () => {
    setLightbox((prev) => ({
      ...prev,
      index: (prev.index - 1 + prev.images.length) % prev.images.length,
    }));
  };

  const lightboxNext = () => {
    setLightbox((prev) => ({
      ...prev,
      index: (prev.index + 1) % prev.images.length,
    }));
  };

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [startDate, endDate, searchFilter, pagination.page, scope]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await unloadingAPI.getStats({ scope });
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
      const params = { page: pagination.page, limit: 15, scope };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchFilter) params.invoiceNumber = searchFilter;

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
        invoiceNumber: editRecord.invoiceNumber,
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

  if (loading && records.length === 0) {
    return (
      <div className="loader-container">
        <div className="loader-spinner" />
        <p>Loading records...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <ClipboardList size={28} />
        <div>
          <h1>{title}</h1>
          <p>Browse unloading records with proof images</p>
        </div>
      </div>

      {/* Stats Cards - Only for My Records */}
      {scope === 'me' && (
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

      {/* Filters */}
      <div className="records-filters">
        <div className="input-group filter-search">
          <Search size={18} className="input-icon" />
          <input
            id="search-invoice"
            type="text"
            placeholder="Search by invoice..."
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
        </div>
        <div className="custom-date-filters" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="quick-filters">
            <button 
              className={`btn-tag ${startDate === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
              onClick={() => setQuickFilter('today')}
            >
              Today
            </button>
            <button className="btn-tag" onClick={() => setQuickFilter('week')}>Week</button>
            <button className="btn-tag" onClick={() => setQuickFilter('month')}>Month</button>
          </div>
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
              title="Start Date"
            />
          </div>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>to</span>
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
              title="End Date"
            />
          </div>
        </div>
        {(startDate || endDate || searchFilter) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setSearchFilter('');
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="btn btn-sm btn-secondary"
          >
            <X size={14} /> Clear
          </button>
        )}
        <span className="records-count">{pagination.total} records</span>
      </div>

      {/* Records Table */}
      {records.length === 0 ? (
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
                  <tr>
                    <th>Invoice</th>
                    <th>Location</th>
                    <th>Employee</th>
                    <th>Parts</th>
                    <th>Images</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id}>
                      <td data-label="Invoice">
                        <span className="record-invoice-cell">
                          <FileText size={14} />
                          #{record.invoiceNumber}
                        </span>
                      </td>
                      <td data-label="Location">
                        <span className="record-location-cell">
                          <MapPin size={13} />
                          {record.locationName}
                        </span>
                      </td>
                      <td data-label="Employee">{record.employee?.name || 'N/A'}</td>
                      <td data-label="Parts">
                        <span className="badge badge-blue">{record.parts?.length || 0}</span>
                      </td>
                      <td data-label="Images">
                        {record.images?.length > 0 ? (
                          <span
                            className="badge badge-img-count"
                            onClick={() => setSelectedRecord(record)}
                            title="View images"
                          >
                            {record.images.length}
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
                      <td data-label="Actions">
                        <div className="table-actions">
                          <button
                            className="btn-icon btn-view"
                            onClick={() => setSelectedRecord(record)}
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>
                          {scope === 'me' && (
                            <>
                              <button
                                className="btn-icon btn-edit"
                                onClick={() => setEditRecord(record)}
                                title="Edit"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDelete(record._id)}
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
                className="btn btn-sm btn-secondary"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="btn btn-sm btn-secondary"
              >
                Next <ChevronRight size={16} />
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
              <h3>Edit Record #{editRecord.invoiceNumber}</h3>
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

            <h2>Invoice #{selectedRecord.invoiceNumber}</h2>
            <div className="modal-details">
              <p><strong>Location:</strong> {selectedRecord.locationName}</p>
              <p><strong>Employee:</strong> {selectedRecord.employee?.name}</p>
              <p><strong>Date:</strong> {new Date(selectedRecord.createdAt).toLocaleString('en-IN')}</p>
            </div>

            <h3>Parts ({selectedRecord.parts?.length})</h3>
            <div className="table-wrapper">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Part Number</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.parts?.map((part, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{part.partNumber || '—'}</td>
                      <td>{part.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3>Proof Images ({selectedRecord.images?.length})</h3>
            <div className="modal-images">
              {selectedRecord.images?.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Proof ${i + 1}`}
                  className="modal-image"
                  onClick={() => openLightbox(selectedRecord.images, i)}
                />
              ))}
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
            {lightbox.images.length > 1 && (
              <button className="lightbox-nav lightbox-prev" onClick={lightboxPrev}>
                <ChevronLeft size={28} />
              </button>
            )}

            <img
              src={lightbox.images[lightbox.index]}
              alt={`Proof ${lightbox.index + 1}`}
              className="lightbox-image"
            />

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
