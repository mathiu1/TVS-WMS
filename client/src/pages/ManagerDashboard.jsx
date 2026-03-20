import { useState, useEffect } from 'react';
import { analyticsAPI, unloadingAPI, authAPI } from '../api/axios';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
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
  Truck,
  BarChart3,
  Award,
  History,
  Activity,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCcw,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  LabelList
} from 'recharts';
import toast from 'react-hot-toast';

const ManagerDashboard = () => {
  const [summary, setSummary] = useState({ totalRecords: 0, todayRecords: 0, thisWeekRecords: 0, activeEmployees: 0 });
  const [chartData, setChartData] = useState({ 
    weeklyTrends: [], 
    employeePerformance: [],
    locationDistribution: [],
    hourlyActivity: [],
    shiftPerformance: [],
    totalParts: 0
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeFilter, setActiveFilter] = useState('week');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Export Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    range: 'week',
    start: '',
    end: '',
    employeeId: 'all'
  });

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
    // Initialize to This Week (7 days) on mount
    if (!startDate && !endDate && activeFilter === 'week') {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      setStartDate(start.toISOString());
      setEndDate(end.toISOString());
    } else {
      fetchData();
    }
  }, [startDate, endDate, activeFilter]);

  // Fetch employees for export dropdown when modal opens
  useEffect(() => {
    if (isExportModalOpen && allEmployees.length === 0) {
      const fetchEmployees = async () => {
        try {
          const res = await authAPI.getUsers();
          setAllEmployees(res.data.data.filter(u => u.role === 'employee'));
        } catch (err) {
          console.error('Failed to fetch employees', err);
        }
      };
      fetchEmployees();
    }
  }, [isExportModalOpen, allEmployees.length]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [summaryRes, chartRes, recordsRes] = await Promise.all([
        analyticsAPI.getSummary(),
        analyticsAPI.getDashboardStats(params),
        unloadingAPI.getAll({ page: 1, limit: 10 }), // Ignore date filters for recent list
      ]);

      setSummary(summaryRes.data.data);
      setChartData(chartRes.data.data);
      setRecords(recordsRes.data.data);
    } catch (err) {
      toast.error('Failed to update dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const params = {};
      if (exportFilters.range === 'custom') {
        if (exportFilters.start) params.startDate = new Date(exportFilters.start).toISOString();
        if (exportFilters.end) params.endDate = new Date(exportFilters.end).toISOString();
      } else {
        const now = new Date();
        let start = new Date(now);
        if (exportFilters.range === 'today') start.setHours(0, 0, 0, 0);
        else if (exportFilters.range === 'yesterday') {
          start.setDate(now.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          params.endDate = new Date(now);
          params.endDate.setDate(now.getDate() - 1);
          params.endDate.setHours(23, 59, 59, 999);
        } else if (exportFilters.range === 'week') start.setDate(now.getDate() - 7);
        else if (exportFilters.range === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (exportFilters.range === 'all') start = new Date(0);
        
        if (exportFilters.range !== 'all') params.startDate = start.toISOString();
      }

      if (exportFilters.employeeId !== 'all') {
        params.employeeId = exportFilters.employeeId;
      }

      const response = await analyticsAPI.exportExcel(params);
      
      // Handle file download
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TVS_WMS_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel report generated successfully!');
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Export failed', err);
      toast.error('Failed to generate Excel report.');
    } finally {
      setExportLoading(false);
    }
  };

  const getSmartInsights = () => {
    const insights = [];
    if (chartData.hourlyActivity && chartData.hourlyActivity.length > 0) {
      const peak = [...chartData.hourlyActivity].sort((a,b) => b.count - a.count)[0];
      if (peak && peak.count > 0) {
        insights.push({ type: 'peak', text: `Peak activity spike detected at ${peak.hour}:00. Maintain high staffing.` });
      }
    }
    if (chartData.locationDistribution && chartData.locationDistribution.length > 0) {
      const topLoc = chartData.locationDistribution[0];
      if (topLoc && topLoc.value > 0) {
        insights.push({ type: 'loc', text: `${topLoc.name} is handled the most volume (${topLoc.value} unloads).` });
      }
    }
    if (chartData.totalParts > 2000) {
      insights.push({ type: 'vol', text: `Handling intensive inventory load: ${chartData.totalParts.toLocaleString()} parts in this period.` });
    }
    return insights.length > 0 ? insights : [{ type: 'info', text: 'All operational metrics are currently balanced.' }];
  };

  const setQuickFilter = (type) => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (type) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        return;
    }

    setActiveFilter(type);
    setStartDate(start.toISOString());
    setEndDate(end.toISOString());
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setActiveFilter('all');
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

  const closeLightbox = () => setLightbox(p => ({ ...p, open: false }));

  const lightboxPrev = () => setLightbox((p) => ({
    ...p,
    index: (p.index - 1 + p.images.length) % p.images.length,
    zoom: 1, rotate: 0, position: { x: 0, y: 0 }
  }));

  const lightboxNext = () => setLightbox((p) => ({
    ...p,
    index: (p.index + 1) % p.images.length,
    zoom: 1, rotate: 0, position: { x: 0, y: 0 }
  }));

  // Handlers for modal interactions
  const handleDragStart = (e) => {
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    setLightbox(p => ({
      ...p,
      isDragging: true,
      touchStart: { x: clientX, y: clientY },
      dragStart: { x: clientX - p.position.x, y: clientY - p.position.y }
    }));
  };

  const handleDragMove = (e) => {
    if (!lightbox.isDragging || lightbox.zoom <= 1) return;
    if (e.type === 'touchmove') e.preventDefault();
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    setLightbox(p => ({
      ...p,
      position: { x: clientX - p.dragStart.x, y: clientY - p.dragStart.y }
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

  if (loading && !summary.totalRecords) {
    return (
      <div className="loader-container">
        <div className="loader-spinner" />
        <p>Initializing Analytics...</p>
      </div>
    );
  }

  return (
    <div className="page-container dashboard-modern">
      {/* Modern Dashboard Header */}
      <div className="dashboard-header-modern">
        <div className="header-info">
          <div className="header-icon">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1>Manager Dashboard</h1>
            <p>TVS Store - Logistics Overview</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="export-btn-modern"
            onClick={() => setIsExportModalOpen(true)}
          >
            <FileSpreadsheet size={18} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="stats-row-modern four-cards">
        <div className="stat-card-modern">
          <div className="card-inner">
            <div className="card-head">
              <span className="label">Today's Unloads</span>
              <div className="icon today"><Activity size={18} /></div>
            </div>
            <div className="card-value">{summary.todayRecords}</div>
            <div className="card-footer-text">Across all docking points</div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="card-inner">
            <div className="card-head">
              <span className="label">
                {activeFilter === 'all' ? 'Total Unloads' : 
                 activeFilter === 'month' ? 'This Month' : 'This Week'}
              </span>
              <div className="icon week"><TrendingUp size={18} /></div>
            </div>
            <div className="card-value">
              {activeFilter === 'all' ? summary.totalRecords : 
               activeFilter === 'month' ? summary.thisMonthRecords : summary.thisWeekRecords}
            </div>
            <div className="card-footer-text">
              {activeFilter === 'all' ? 'Historical total performance' : 
               activeFilter === 'month' ? 'Current month to date' : 'Current cycle performance'}
            </div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="card-inner">
            <div className="card-head">
              <span className="label">Staff On Duty</span>
              <div className="icon employees"><Users size={18} /></div>
            </div>
            <div className="card-value">{summary.activeEmployees}</div>
            <div className="card-footer-text">Verified warehouse agents</div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="card-inner">
            <div className="card-head">
              <span className="label">Total Parts</span>
              <div className="icon parts-vol"><Package size={18} /></div>
            </div>
            <div className="card-value">{(chartData.totalParts || 0).toLocaleString()}</div>
            <div className="card-footer-text">Inventory volume handled</div>
          </div>
        </div>
      </div>

      {/* Smart Insights Section */}
      <div className="smart-insights-modern">
        <div className="insights-header">
          <LayoutDashboard size={14} />
          <span>OPERATIONAL INSIGHTS</span>
        </div>
        <div className="insights-list">
          {getSmartInsights().map((ins, i) => (
            <div key={i} className={`insight-item ${ins.type}`}>
               <div className="insight-pulse"></div>
               <p>{ins.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Control & Filter Section */}
      <div className="dashboard-controls-modern">
        <div className="filter-group-modern">
          <button
            className={`f-tab ${activeFilter === 'today' ? 'active' : ''}`}
            onClick={() => setQuickFilter('today')}
          >Today</button>
          <button
            className={`f-tab ${activeFilter === 'yesterday' ? 'active' : ''}`}
            onClick={() => setQuickFilter('yesterday')}
          >Yesterday</button>
          <button
            className={`f-tab ${activeFilter === 'week' ? 'active' : ''}`}
            onClick={() => setQuickFilter('week')}
          >This Week</button>
          <button
            className={`f-tab ${activeFilter === 'month' ? 'active' : ''}`}
            onClick={() => setQuickFilter('month')}
          >This Month</button>
          <button
            className={`f-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={clearFilters}
          >All Time</button>
        </div>

        <div className="custom-range-modern">
          <div className="date-box">
            <Calendar size={14} />
            <input
              type="date"
              value={startDate ? startDate.split('T')[0] : ''}
              onChange={(e) => {
                setStartDate(new Date(e.target.value).toISOString());
                setActiveFilter('custom');
              }}
            />
          </div>
          <span className="sep">-</span>
          <div className="date-box">
            <Calendar size={14} />
            <input
              type="date"
              value={endDate ? endDate.split('T')[0] : ''}
              onChange={(e) => {
                setEndDate(new Date(e.target.value).toISOString());
                setActiveFilter('custom');
              }}
            />
          </div>
          {(startDate || endDate) && (
            <button className="clear-btn" onClick={clearFilters}><X size={14} /></button>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid-modern">
        {/* Unloading Trend Chart - Area Style */}
        <div className="chart-container-modern">
          <div className="chart-header">
            <div className="header-title">
              <History size={16} />
              <h3>Unloading Trend</h3>
            </div>
            <span className="chart-legend">Daily Operations</span>
          </div>
          <div className="chart-body">
            {chartData.weeklyTrends && chartData.weeklyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData.weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUnload" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorUnload)"
                    animationDuration={1500}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">
                <BarChart3 size={40} strokeWidth={1} />
                <p>No unloading data for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Employee Performance Chart - Single Row Style */}
        <div className="chart-container-modern">
          <div className="chart-header">
            <div className="header-title">
              <Award size={16} />
              <h3>Employee Performance</h3>
            </div>
            <span className="chart-legend">Efficiency Ranking</span>
          </div>
          <div className="chart-body scrollable-chart">
            {chartData.employeePerformance && chartData.employeePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(260, chartData.employeePerformance.length * 45)}>
                <BarChart 
                  layout="vertical" 
                  data={chartData.employeePerformance} 
                  margin={{ left: -15, right: 35, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      fontSize: '11px'
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 10, 10, 0]}
                    barSize={18}
                    background={{ fill: '#f1f5f9', radius: 10 }}
                    animationDuration={1500}
                  >
                    <LabelList 
                      dataKey="count" 
                      position="right" 
                      offset={8}
                      style={{ fill: '#64748b', fontSize: '10px', fontWeight: '800' }} 
                    />
                    {chartData.employeePerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">
                <Users size={40} strokeWidth={1} />
                <p>No staff performance data</p>
              </div>
            )}
          </div>
        </div>

        {/* Hourly Spikes - Heatmap Style Bar Chart */}
        <div className="chart-container-modern">
          <div className="chart-header">
            <div className="header-title">
              <Clock size={16} />
              <h3>Peak Activity Hours</h3>
            </div>
            <span className="chart-legend">Load Heatmap</span>
          </div>
          <div className="chart-body">
            {chartData.hourlyActivity && chartData.hourlyActivity.length > 0 ? (
               <ResponsiveContainer width="100%" height={260}>
                 <BarChart data={chartData.hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="hour" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(val) => `${val}:00`}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">
                <Clock size={40} strokeWidth={1} />
                <p>No activity data for heatmaps</p>
              </div>
            )}
          </div>
        </div>

        {/* Location Utilization - Donut Style */}
        <div className="chart-container-modern">
          <div className="chart-header">
            <div className="header-title">
              <MapPin size={16} />
              <h3>Location Utilization</h3>
            </div>
            <span className="chart-legend">Bay Distribution</span>
          </div>
          <div className="chart-body">
            {chartData.locationDistribution && chartData.locationDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={chartData.locationDistribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1500}
                  >
                    {chartData.locationDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[
                        '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', 
                        '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#d946ef',
                        '#ec4899', '#14b8a6', '#facc15', '#a855f7', '#fb7185',
                        '#94a3b8' // Color for 'Others' or overflow
                      ][index % 16]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">
                <MapPin size={40} strokeWidth={1} />
                <p>Bay usage data unavailable</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Records Section */}
      <div className="recent-ops-modern">
        <div className="ops-header">
          <div className="header-title">
            <History size={18} />
            <h2>Recent Unloading Reports</h2>
          </div>
          <p className="ops-count">Showing last 10 activities</p>
        </div>

        <div className="ops-list-modern">
          {records.length === 0 ? (
            <div className="ops-empty">
              <Box size={32} />
              <p>No operational records found.</p>
            </div>
          ) : (
            records.map((record) => (
              <div key={record._id} className="ops-item-modern">
                <div className="item-main">
                  <div className="item-icon">
                    <Truck size={18} />
                  </div>
                  <div className="item-info">
                    <span className="v-num">{record.vehicleNumber}</span>
                    <span className="v-loc">{record.locationName}</span>
                  </div>
                </div>

                <div className="item-details mobile-hide">
                  <div className="detail-point">
                    <User size={12} />
                    <span>{record.employee?.name || 'Unknown'}</span>
                  </div>
                  <div className="detail-point">
                    <Package size={12} />
                    <span>{record.vendors?.length || 0} Vendors</span>
                  </div>
                </div>

                <div className="item-meta">
                  <span className="v-time">
                    {new Date(record.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button className="inspect-btn" onClick={() => setSelectedRecord(record)}>
                    <Eye size={14} />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal & Lightbox remain the same but with modern styling */}
      {selectedRecord && (
        <div className="modal-overlay-modern" onClick={() => setSelectedRecord(null)}>
          <div className="modal-wrapper-modern" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-modern">
              <div className="vehicle-info">
                <div className="v-icon"><Truck size={20} /></div>
                <div>
                  <h2 className="modal-title">{selectedRecord.vehicleNumber}</h2>
                  <p className="modal-subtitle">Unloading Detail Report</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedRecord(null)}><X size={20} /></button>
            </div>

            <div className="modal-body-modern">
              <div className="meta-grid">
                <div className="meta-item">
                  <span className="label">Unloading Agent</span>
                  <span className="value">{selectedRecord.employee?.name}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Unload Timestamp</span>
                  <span className="value">{new Date(selectedRecord.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <h3>Vendors & Inventory Breakdown</h3>
              <div className="table-container-modern">
                <table className="modern-data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Unique ID</th>
                      <th>Vendor Name</th>
                      <th>Location</th>
                      <th className="center">Invoices</th>
                      <th className="center">Parts</th>
                      <th>Proof Photos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecord.vendors?.map((v, i) => (
                      <tr key={i} className="row-hover" onClick={() => v.images?.length > 0 && openLightbox(v.images, 0)}>
                        <td>{i + 1}</td>
                        <td><span className="id-tag">{v.vendorId || '—'}</span></td>
                        <td>{v.vendorName || '—'}</td>
                        <td>{v.storageLocation || '—'}</td>
                        <td className="center">{v.invoiceCount}</td>
                        <td className="center">{v.partsCount}</td>
                        <td>
                          <div className="photo-row-modern">
                            {v.images?.map((img, idx) => (
                              <img key={idx} src={img} alt="P" className="mini-thumb" />
                            ))}
                            {(!v.images || v.images.length === 0) && <span className="no-photos">None</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Implementation (Integrated zoom/rotate logic) */}
      {lightbox.open && (
        <div className="modern-lightbox" onClick={closeLightbox}>
          <button className="l-close" onClick={closeLightbox}><X size={24} /></button>

          <div className="l-body" onClick={(e) => e.stopPropagation()}>
            <div className="l-controls">
              <button onClick={() => setLightbox(p => ({ ...p, zoom: Math.min(p.zoom + 0.25, 3) }))}><ZoomIn size={18} /></button>
              <button onClick={() => setLightbox(p => ({ ...p, zoom: Math.max(p.zoom - 0.25, 0.5) }))}><ZoomOut size={18} /></button>
              <button onClick={() => setLightbox(p => ({ ...p, rotate: (p.rotate + 90) % 360 }))}><RotateCw size={18} /></button>
              <button onClick={() => setLightbox(p => ({ ...p, zoom: 1, rotate: 0, position: { x: 0, y: 0 } }))}><RefreshCcw size={18} /></button>
            </div>

            {lightbox.images.length > 1 && (
              <button className="l-nav l-prev" onClick={lightboxPrev}><ChevronLeft size={28} /></button>
            )}

            <div className="l-img-wrap"
              onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
              onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
            >
              <img
                src={lightbox.images[lightbox.index]}
                style={{
                  transform: `translate(${lightbox.position.x}px, ${lightbox.position.y}px) scale(${lightbox.zoom}) rotate(${lightbox.rotate}deg)`,
                  transition: lightbox.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseDown={handleDragStart} onTouchStart={handleDragStart}
                draggable="false"
              />
            </div>

            {lightbox.images.length > 1 && (
              <button className="l-nav l-next" onClick={lightboxNext}><ChevronRight size={28} /></button>
            )}
          </div>
        </div>
      )}

      {/* Excel Export Modal */}
      {isExportModalOpen && (
        <div className="modal-overlay-modern" onClick={() => !exportLoading && setIsExportModalOpen(false)}>
          <div className="modal-content-modern export-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-title">
                <div className="header-icon-small">
                  <FileSpreadsheet size={20} />
                </div>
                <h3>Export Professional Reports</h3>
              </div>
              <button className="close-btn" onClick={() => setIsExportModalOpen(false)} disabled={exportLoading}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="export-section">
                <label>Time Period</label>
                <div className="export-tabs">
                  {['today', 'yesterday', 'week', 'month', 'all', 'custom'].map(r => (
                    <button 
                      key={r}
                      className={`export-tab ${exportFilters.range === r ? 'active' : ''}`}
                      onClick={() => setExportFilters(p => ({ ...p, range: r }))}
                    >
                      {r === 'all' ? 'All Time' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {exportFilters.range === 'custom' && (
                <div className="export-section date-range-inputs">
                  <div className="input-group">
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      value={exportFilters.start}
                      onChange={e => setExportFilters(p => ({ ...p, start: e.target.value }))}
                    />
                  </div>
                  <div className="input-group">
                    <label>End Date</label>
                    <input 
                      type="date" 
                      value={exportFilters.end}
                      onChange={e => setExportFilters(p => ({ ...p, end: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div className="export-section">
                <label>Filter by Employee</label>
                <div className="select-wrapper">
                  <User size={16} className="select-icon" />
                  <select 
                    value={exportFilters.employeeId}
                    onChange={e => setExportFilters(p => ({ ...p, employeeId: e.target.value }))}
                  >
                    <option value="all">All Employees</option>
                    {allEmployees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setIsExportModalOpen(false)} disabled={exportLoading}>
                Cancel
              </button>
              <button 
                className="export-btn-primary" 
                onClick={handleExportExcel}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <div className="btn-loader" />
                ) : (
                  <>
                    <Download size={18} />
                    <span>Generate Excel Report</span>
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

export default ManagerDashboard;
