import { useState, useEffect } from 'react';
import { analyticsAPI, unloadingAPI } from '../api/axios';
import {
  Users,
  Calendar,
  MapPin,
  Package,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  Mail,
  X,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

const EmployeeReports = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });

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
    setLightbox({ open: true, images, index });
  };
  const closeLightbox = () => setLightbox({ open: false, images: [], index: 0 });
  const lightboxPrev = () => setLightbox((p) => ({ ...p, index: (p.index - 1 + p.images.length) % p.images.length }));
  const lightboxNext = () => setLightbox((p) => ({ ...p, index: (p.index + 1) % p.images.length }));

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { filter };
      if (filter === 'custom') {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      }
      const res = await analyticsAPI.getEmployeeReports(params);
      setEmployees(res.data.data);
    } catch (err) {
      toast.error('Failed to load employee reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) {
      toast.error('Please select both start and end dates.');
      return;
    }
    fetchReports();
  };

  const totalUnloads = employees.reduce((sum, emp) => sum + emp.totalUnloads, 0);
  const totalParts = employees.reduce((sum, emp) => sum + emp.totalParts, 0);

  const filterLabels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    custom: 'Custom Range',
    all: 'All Time',
  };

  if (loading && employees.length === 0) {
    return (
      <div className="loader-container">
        <div className="loader-spinner" />
        <p>Loading employee reports...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Users size={28} />
        <div>
          <h1>Employee Reports</h1>
          <p>Track employee unloading performance by date range</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="report-filters">
        <div className="filter-tabs">
          {['today', 'week', 'month', 'all', 'custom'].map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => {
                setFilter(f);
                setExpandedId(null);
              }}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {filter === 'custom' && (
          <div className="custom-date-range">
            <div className="input-group">
              <Calendar size={16} className="input-icon" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                placeholder="Start date"
              />
            </div>
            <span className="date-separator">to</span>
            <div className="input-group">
              <Calendar size={16} className="input-icon" />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                placeholder="End date"
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleCustomApply}>
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="summary-grid report-summary">
        <div className="summary-card">
          <div className="summary-icon blue">
            <Users size={20} />
          </div>
          <div>
            <div className="summary-value">{employees.length}</div>
            <div className="summary-label">Active Employees</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon green">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="summary-value">{totalUnloads}</div>
            <div className="summary-label">Total Unloads</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon purple">
            <Package size={20} />
          </div>
          <div>
            <div className="summary-value">{totalParts}</div>
            <div className="summary-label">Total Parts</div>
          </div>
        </div>
      </div>

      {/* Employee Cards */}
      {employees.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>No employee activity found for {filterLabels[filter].toLowerCase()}.</p>
        </div>
      ) : (
        <div className="employee-list">
          {employees.map((emp) => (
            <div key={emp.employeeId} className="employee-report-card">
              {/* Employee Header */}
              <div
                className="employee-card-header"
                onClick={() => setExpandedId(expandedId === emp.employeeId ? null : emp.employeeId)}
              >
                <div className="employee-info">
                  <div className="employee-avatar">
                    {emp.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="employee-details">
                    <h3>{emp.name}</h3>
                    <span className="employee-email">
                      <Mail size={12} /> {emp.email}
                    </span>
                  </div>
                </div>

                <div className="employee-stats">
                  <div className="stat-pill blue">
                    <Package size={14} />
                    <span>{emp.totalUnloads} unloads</span>
                  </div>
                  <div className="stat-pill green">
                    <TrendingUp size={14} />
                    <span>{emp.totalParts} parts</span>
                  </div>
                  <div className="stat-pill muted">
                    <MapPin size={14} />
                    <span>{emp.locations?.length} locations</span>
                  </div>
                </div>

                <button className="expand-btn" title="Toggle details">
                  {expandedId === emp.employeeId ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {/* Expanded Records */}
              {expandedId === emp.employeeId && (
                <div className="employee-records">
                  <div className="employee-meta">
                    <p>
                      <Clock size={14} />
                      <strong>Last Activity:</strong>{' '}
                      {new Date(emp.lastActivity).toLocaleString('en-IN')}
                    </p>
                    <p>
                      <MapPin size={14} />
                      <strong>Locations:</strong> {emp.locations?.join(', ')}
                    </p>
                  </div>

                  <h4>Recent Records ({emp.records?.length})</h4>
                  <div className="table-wrapper">
                    <table className="data-table compact">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Invoice</th>
                          <th>Location</th>
                          <th>Parts</th>
                          <th>Images</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emp.records?.map((rec, i) => (
                          <tr
                            key={rec._id}
                            className="clickable-row"
                            onClick={() => openRecord(rec._id)}
                            title="Click to view full record"
                          >
                            <td>{i + 1}</td>
                            <td>
                              <FileText size={13} className="inline-icon" />
                              #{rec.invoiceNumber}
                            </td>
                            <td>{rec.locationName}</td>
                            <td>{rec.partsCount}</td>
                            <td>{rec.imagesCount}</td>
                            <td>
                              {new Date(rec.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Record Detail Modal */}
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

      {/* Loading overlay for record fetch */}
      {recordLoading && (
        <div className="modal-overlay">
          <div className="loader-spinner" />
        </div>
      )}
    </div>
  );
};

export default EmployeeReports;
