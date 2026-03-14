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
  }, [startDate, endDate, searchFilter, pagination.page, scope]);

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

      {/* Records Grid */}
      {records.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <p>No records found.</p>
        </div>
      ) : (
        <>
          <div className="records-grid">
            {records.map((record) => (
              <div key={record._id} className="record-card">
                <div className="record-header">
                  <span className="record-invoice">
                    <FileText size={14} />
                    #{record.invoiceNumber}
                  </span>
                  <span className="record-date">
                    {new Date(record.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="record-body">
                  <p>
                    <MapPin size={13} />
                    <strong>Location:</strong> {record.locationName}
                  </p>
                  <p>
                    <strong>Employee:</strong> {record.employee?.name || 'N/A'}
                  </p>
                  <p>
                    <strong>Parts:</strong> {record.parts?.length || 0} items
                  </p>
                </div>

                {record.images && record.images.length > 0 && (
                  <div className="record-images">
                    {record.images.slice(0, 3).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Proof ${i + 1}`}
                        className="record-thumb"
                        onClick={() => setSelectedRecord(record)}
                      />
                    ))}
                    {record.images.length > 3 && (
                      <div
                        className="record-thumb-more"
                        onClick={() => setSelectedRecord(record)}
                      >
                        +{record.images.length - 3}
                      </div>
                    )}
                  </div>
                )}

                <button
                  className="btn btn-sm btn-secondary btn-full"
                  onClick={() => setSelectedRecord(record)}
                >
                  <Eye size={14} /> View Details
                </button>
                {scope === 'me' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn btn-sm btn-secondary btn-full"
                      onClick={() => setEditRecord(record)}
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger btn-full"
                      onClick={() => handleDelete(record._id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
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
