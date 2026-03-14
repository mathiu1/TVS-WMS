import { useState, useEffect } from 'react';
import { unloadingAPI } from '../api/axios';
import {
  ClipboardList,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Records = () => {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
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
  }, [dateFilter, searchFilter, pagination.page]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 12 };
      if (dateFilter) params.date = dateFilter;
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
          <h1>Unloading Records</h1>
          <p>Browse all vehicle unloading records with proof images</p>
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
        <div className="input-group filter-date">
          <Calendar size={18} className="input-icon" />
          <input
            id="filter-date"
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
        </div>
        {(dateFilter || searchFilter) && (
          <button
            onClick={() => {
              setDateFilter('');
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
