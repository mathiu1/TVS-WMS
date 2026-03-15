import { useState, useEffect } from 'react';
import { analyticsAPI, unloadingAPI } from '../api/axios';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  User,
  Package,
  Calendar,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Globe,
  MapPin,
  Box,
  Clock,
  Clipboard,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManagerDashboard = () => {
  const [report, setReport] = useState([]);
  const [summary, setSummary] = useState({ totalRecords: 0, todayRecords: 0, activeEmployees: 0 });
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'hour', 'today', 'week', 'month', 'custom', 'all'
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fetch data on mount and filter change
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [reportRes, summaryRes, recordsRes] = await Promise.all([
        analyticsAPI.getDailyReport(params),
        analyticsAPI.getSummary(),
        unloadingAPI.getAll({ page: pagination.page, limit: 10, startDate, endDate }),
      ]);

      setReport(reportRes.data.data);
      setSummary(summaryRes.data.data);
      setRecords(recordsRes.data.data);
      setPagination(recordsRes.data.pagination);
    } catch (err) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    try {
      const res = await unloadingAPI.getAll({ page: newPage, limit: 10, startDate, endDate });
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load records.');
    }
  };

  const setQuickFilter = (type) => {
    const now = new Date();
    let start, end;

    switch (type) {
      case 'hour':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        end = now;
        break;
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = now;
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = now;
        break;
      default:
        return;
    }

    setActiveFilter(type);
    setStartDate(start.toISOString());
    setEndDate(end.toISOString());
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setActiveFilter('all');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <LayoutDashboard size={28} />
        <div>
          <h1>Manager Dashboard</h1>
          <p>Daily vehicle unloading analytics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon blue">
            <Package size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.totalRecords}</span>
            <span className="summary-label">Total Records</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon green">
            <TrendingUp size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.todayRecords}</span>
            <span className="summary-label">Today's Unloads</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon purple">
            <Users size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.activeEmployees}</span>
            <span className="summary-label">Active Employees</span>
          </div>
        </div>
      </div>

      {/* Luxury Filter Bar */}
      <div className="filter-card">
        <div className="filter-bar dashboard-filters">
          <div className="filter-group">
            <span className="filter-label">Quick Range:</span>
            <div className="quick-filters">
              <button 
                className={`btn-tag ${activeFilter === 'hour' ? 'active' : ''}`} 
                onClick={() => setQuickFilter('hour')}
              >
                Last Hour
              </button>
              <button 
                className={`btn-tag ${activeFilter === 'today' ? 'active' : ''}`} 
                onClick={() => setQuickFilter('today')}
              >
                Today
              </button>
              <button 
                className={`btn-tag ${activeFilter === 'week' ? 'active' : ''}`} 
                onClick={() => setQuickFilter('week')}
              >
                Week
              </button>
              <button 
                className={`btn-tag ${activeFilter === 'month' ? 'active' : ''}`} 
                onClick={() => setQuickFilter('month')}
              >
                Month
              </button>
            </div>
          </div>

          <div className="filter-separator"></div>

          <div className="filter-group">
            <span className="filter-label">Custom Period:</span>
            <div className="custom-date-filters">
              <div className="input-group filter-input">
                <Calendar size={18} className="input-icon" />
                <input
                  id="start-date"
                  type="date"
                  value={startDate ? startDate.split('T')[0] : ''}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActiveFilter('custom');
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  title="Start Date"
                />
              </div>
              <span className="filter-range-text">to</span>
              <div className="input-group filter-input">
                <Calendar size={18} className="input-icon" />
                <input
                  id="end-date"
                  type="date"
                  value={endDate ? endDate.split('T')[0] : ''}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActiveFilter('custom');
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  title="End Date"
                />
              </div>
            </div>
          </div>

          {(startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="btn-clear"
              title="Reset All Filters"
            >
              <X size={16} /> <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Daily Report Table */}
      <div className="table-card">
        <h2 className="table-title">
          <TrendingUp size={20} />
          Daily Unloading Report
        </h2>

        {report.length === 0 ? (
          <div className="empty-state">
            <Search size={40} />
            <p>No data found for the selected criteria.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Total Unloaded</th>
                  <th>Invoices</th>
                  <th>Locations</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <div className="cell-employee">
                        <span className="emp-name">{row.employeeName}</span>
                        <span className="emp-email">{row.employeeEmail}</span>
                      </div>
                    </td>
                    <td>{new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <span className="badge badge-blue">{row.totalUnloaded}</span>
                    </td>
                    <td>
                      <div className="cell-tags">
                        {row.invoices.slice(0, 3).map((inv, i) => (
                          <span key={i} className="tag">{inv}</span>
                        ))}
                        {row.invoices.length > 3 && (
                          <span className="tag tag-more">+{row.invoices.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="cell-tags">
                        {row.locations.map((loc, i) => (
                          <span key={i} className="tag tag-location">{loc}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Records with Images */}
      <div className="table-card">
        <h2 className="table-title">
          <Package size={20} />
          Recent Unloading Records
        </h2>

        {records.length === 0 ? (
          <div className="empty-state">
            <Package size={40} />
            <p>No records found.</p>
          </div>
        ) : (
          <>
            <div className="records-grid">
              {records.map((record) => (
                <div key={record._id} className="record-card">
                  <div className="record-card-header">
                    <div className="record-invoice-pill">
                      <Clipboard size={14} />
                      <span>#{record.invoiceNumber}</span>
                    </div>
                    <div className="record-time-pill">
                      <Clock size={14} />
                      <span>
                        {new Date(record.createdAt).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="record-card-body">
                    <div className="record-detail-item">
                      <MapPin size={12} className="detail-icon location" />
                      <div className="detail-text">
                        <span className="detail-label">Location</span>
                        <span className="detail-value">{record.locationName}</span>
                      </div>
                    </div>

                    <div className="record-detail-item">
                      <User size={12} className="detail-icon employee" />
                      <div className="detail-text">
                        <span className="detail-label">Employee</span>
                        <span className="detail-value">{record.employee?.name || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="record-detail-item">
                      <Box size={12} className="detail-icon parts" />
                      <div className="detail-text">
                        <span className="detail-label">Parts</span>
                        <span className="detail-value">{record.parts?.length || 0} items uploaded</span>
                      </div>
                    </div>
                  </div>

                  <div className="record-card-footer">
                    <div className="record-full-date">
                      {new Date(record.createdAt).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </div>
                    <button
                      className="btn-view-details"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <Eye size={16} />
                      <span>View Details</span>
                    </button>
                  </div>
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
                  <ChevronLeft size={16} />
                </button>
                <span className="pagination-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="btn btn-sm btn-secondary"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

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
                    <th>Part Name</th>
                    <th>Part Number</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.parts?.map((part, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{part.partName}</td>
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
                  alt={`Proof image ${i + 1}`}
                  className="modal-image"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
