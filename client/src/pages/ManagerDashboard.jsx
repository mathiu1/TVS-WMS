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
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCcw,
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
  const [lightbox, setLightbox] = useState({ 
    open: false, 
    images: [], 
    index: 0,
    zoom: 1,
    rotate: 0,
    position: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 }
  });

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
    if (lightbox.zoom <= 1) return;
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    setLightbox(p => ({
      ...p,
      isDragging: true,
      dragStart: { x: clientX - p.position.x, y: clientY - p.position.y }
    }));
  };

  const handleDragMove = (e) => {
    if (!lightbox.isDragging || lightbox.zoom <= 1) return;
    e.preventDefault();
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    setLightbox(p => ({
      ...p,
      position: { x: clientX - p.dragStart.x, y: clientY - p.dragStart.y }
    }));
  };

  const handleDragEnd = () => {
    setLightbox(p => ({ ...p, isDragging: false }));
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
    <div className="page-container dashboard-premium">
      {/* Premium Header */}
      <div className="dashboard-header-v2">
        <div className="header-left">
          <h1 className="header-title-main">Manager Dashboard</h1>
          <p className="header-subtitle">Intelligence & Operations Analytics Overview</p>
        </div>
        <div className="header-right mobile-hide">
          <div className="live-indicator">
            <span className="dot"></span>
            <span>Live Data Stream</span>
          </div>
        </div>
      </div>

      {/* Premium Stats Grid */}
      <div className="stats-grid-v2">
        <div className="stat-card-v2">
          <div className="card-top">
            <div className="icon-box dark">
              <Package size={18} />
            </div>
            <div className="stat-trend up">
              <TrendingUp size={14} />
              <span>+12.5%</span>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Records</span>
            <span className="stat-value">{summary.totalRecords}</span>
          </div>
        </div>

        <div className="stat-card-v2">
          <div className="card-top">
            <div className="icon-box gold">
              <TrendingUp size={18} />
            </div>
            <div className="stat-trend up">
              <TrendingUp size={14} />
              <span>+8.2%</span>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Today's Unloads</span>
            <span className="stat-value">{summary.todayRecords}</span>
          </div>
        </div>

        <div className="stat-card-v2">
          <div className="card-top">
            <div className="icon-box dark">
              <Users size={18} />
            </div>
            <div className="stat-trend">
              <span style={{ color: '#64748b' }}>Active Now</span>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{summary.activeEmployees}</span>
          </div>
        </div>
      </div>

      {/* Premium Filter Section */}
      <div className="premium-filter-section">
        <div className="filter-tabs">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'hour', label: 'Last Hour' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`filter-tab ${activeFilter === tab.id ? 'active' : ''}`}
              onClick={() => tab.id === 'all' ? clearFilters() : setQuickFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="date-range-integrated">
          <div className="date-input-v2">
            <Calendar size={16} />
            <input
              type="date"
              value={startDate ? startDate.split('T')[0] : ''}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveFilter('custom');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
          </div>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>→</span>
          <div className="date-input-v2">
            <Calendar size={16} />
            <input
              type="date"
              value={endDate ? endDate.split('T')[0] : ''}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActiveFilter('custom');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
          </div>
          
          {(startDate || endDate) && (
            <button onClick={clearFilters} className="btn-icon-only tertiary" title="Clear Filters">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Daily Report Section (Modern Table) */}
      <div className="table-card premium-surface mb-huge">
        <div className="card-header-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="icon-badge-gold">
              <Clipboard size={18} />
            </div>
            <h2 className="section-title-premium">Performance Report</h2>
          </div>
        </div>

        <div className="table-wrapper-v2">
          {report.length === 0 ? (
            <div className="empty-state-v2">
              <Search size={48} />
              <p>No operational data for this period.</p>
            </div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Operations Agent</th>
                  <th>Observation Date</th>
                  <th>Throughput</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row, index) => (
                  <tr key={index}>
                    <td data-label="Operations Agent">
                      <div className="user-cell-premium">
                        <div className="avatar-mini">{(row.employeeName || 'U').charAt(0)}</div>
                        <div className="user-info">
                          <span className="user-name">{row.employeeName}</span>
                          <span className="user-email">{row.employeeEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Observation Date" className="date-cell">
                      {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td data-label="Throughput">
                      <div className="throughput-badge">
                        <span className="value">{row.totalUnloaded}</span>
                        <span className="label">Unloads</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Records Section (Premium Cards) */}
      <div className="records-section-v2">
        <div className="records-section-header">
          <h2>Recent Operations</h2>
          <div className="pagination-minimal">
             {pagination.pages > 1 && (
               <>
                 <button 
                   onClick={() => handlePageChange(pagination.page - 1)} 
                   disabled={pagination.page === 1}
                   className="btn-pagination"
                 >
                   <ChevronLeft size={18} />
                 </button>
                 <span className="page-indicator">
                   {pagination.page} / {pagination.pages}
                 </span>
                 <button 
                   onClick={() => handlePageChange(pagination.page + 1)} 
                   disabled={pagination.page === pagination.pages}
                   className="btn-pagination"
                 >
                   <ChevronRight size={18} />
                 </button>
               </>
             )}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="empty-state-card">
            <Box size={40} />
            <p>Waiting for incoming data...</p>
          </div>
        ) : (
          <div className="records-grid-v2">
            {records.map((record) => (
              <div key={record._id} className="record-card-v2">
                <div className="card-header">
                  <div className="invoice-id">
                    <Clipboard size={14} />
                    <span>#{record.invoiceNumber}</span>
                  </div>
                  <div className="time-tag">
                    <Clock size={12} />
                    <span>
                      {new Date(record.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="compact-info">
                    <div className="info-icon loc">
                      <MapPin size={16} />
                    </div>
                    <div className="info-content">
                      <span className="info-label">Docking Location</span>
                      <span className="info-value">{record.locationName}</span>
                    </div>
                  </div>

                  <div className="compact-info">
                    <div className="info-icon emp">
                      <User size={16} />
                    </div>
                    <div className="info-content">
                      <span className="info-label">Operator</span>
                      <span className="info-value">{record.employee?.name || 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="compact-info">
                    <div className="info-icon qty">
                      <Package size={16} />
                    </div>
                    <div className="info-content">
                      <span className="info-label">Inventory Items</span>
                      <span className="info-value">{record.parts?.length || 0} Components</span>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <span className="card-date-stamp">
                    {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                  <button className="btn-details-minimal" onClick={() => setSelectedRecord(record)}>
                    <Eye size={14} />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
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

export default ManagerDashboard;
