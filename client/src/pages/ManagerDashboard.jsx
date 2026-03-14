import { useState, useEffect } from 'react';
import { analyticsAPI, unloadingAPI } from '../api/axios';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Package,
  Calendar,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManagerDashboard = () => {
  const [report, setReport] = useState([]);
  const [summary, setSummary] = useState({ totalRecords: 0, todayRecords: 0, activeEmployees: 0 });
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fetch data on mount and date change
  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) {
        params.startDate = dateFilter;
        params.endDate = dateFilter;
      }

      const [reportRes, summaryRes, recordsRes] = await Promise.all([
        analyticsAPI.getDailyReport(params),
        analyticsAPI.getSummary(),
        unloadingAPI.getAll({ page: pagination.page, limit: 10, date: dateFilter || undefined }),
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
      const res = await unloadingAPI.getAll({ page: newPage, limit: 10, date: dateFilter || undefined });
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load records.');
    }
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

      {/* Date Filter */}
      <div className="filter-bar">
        <div className="input-group filter-input">
          <Calendar size={18} className="input-icon" />
          <input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="btn btn-sm btn-secondary"
          >
            <X size={14} /> Clear
          </button>
        )}
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
                  <div className="record-header">
                    <span className="record-invoice">#{record.invoiceNumber}</span>
                    <span className="record-date">
                      {new Date(record.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="record-body">
                    <p><strong>Location:</strong> {record.locationName}</p>
                    <p><strong>Employee:</strong> {record.employee?.name || 'N/A'}</p>
                    <p><strong>Parts:</strong> {record.parts?.length || 0} items</p>
                  </div>

                  {/* Proof Images */}
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
