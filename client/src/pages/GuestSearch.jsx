import { useState, useEffect } from 'react';
import { unloadingAPI } from '../api/axios';
import {
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Truck,
  Package,
  Calendar,
  Warehouse,
  User,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModernLoader from '../components/ModernLoader';

const GuestSearch = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
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

  const closeLightbox = () => setLightbox({ open: false, images: [], index: 0 });

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

    setLightbox(p => ({
      ...p,
      isDragging: true,
      touchStart: { x: clientX, y: clientY },
      dragStart: { x: clientX - p.position.x, y: clientY - p.position.y }
    }));
  };

  const handleDragMove = (e) => {
    if (!lightbox.isDragging) return;
    if (e.type === 'touchmove') e.preventDefault();
    if (lightbox.zoom <= 1) return;

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

  const [lastSearchedTerm, setLastSearchedTerm] = useState('');

  const handleSearch = async (searchTerm = searchFilter) => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) {
      setRecords([]);
      setLastSearchedTerm('');
      return;
    }

    setLoading(true);
    try {
      const res = await unloadingAPI.publicSearch({ vehicleNumber: trimmed });
      setRecords(res.data.data);
      setLastSearchedTerm(trimmed);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchFilter.trim().length >= 2) {
        handleSearch(searchFilter);
      } else {
        setRecords([]);
        setLastSearchedTerm('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchFilter]);

  const onFormSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="guest-container">
      <div className="guest-header">
        <div className="brand-logo">
          <Warehouse size={40} className="logo-icon" />
          <h1>Guest Portal</h1>
        </div>
        <p className="subtitle">Track and verify unloading reports by Unique ID</p>
      </div>

      <div className="guest-search-box">
        <form onSubmit={onFormSubmit} className="search-form-modern">
          <Search size={22} className="search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="guest-results">
        {loading ? (
          <ModernLoader variant="table-skeleton" />
        ) : records.length > 0 ? (
          <div className="table-card guest-table-card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Unique ID</th>
                    <th>Vendor Name</th>
                    <th>Vehicle</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th className="center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    record.vendors?.map((vendor, vIdx) => {
                      const s = searchFilter.toLowerCase();
                      const vId = (vendor.vendorId || '').toLowerCase();

                      // Only match if search term is part of Vendor ID (Unique ID)
                      const isMatch = vId.includes(s) || (s.length > 0 && /^\d+$/.test(s) && vId.endsWith(s.padStart(4, '0').slice(-s.length)));

                      if (!isMatch && searchFilter.trim().length >= 2) return null;

                      return (
                        <tr
                          key={`${record._id}-${vIdx}`}
                          className="row-hover clickable-guest-row"
                          onClick={() => setSelectedRecord(record)}
                        >
                          <td data-label="Unique ID">
                            <span className="id-badge-modern">{vendor.vendorId || '—'}</span>
                          </td>
                          <td data-label="Vendor">{vendor.vendorName || '—'}</td>
                          <td data-label="Vehicle">{record.vehicleNumber}</td>
                          <td data-label="Location">
                            <div className="loc-cell">
                              <MapPin size={12} />
                              <span>{vendor.storageLocation || '—'}</span>
                            </div>
                          </td>
                          <td data-label="Date">
                            {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="center">
                            <button className="view-btn-guest" onClick={() => setSelectedRecord(record)}>
                              <Eye size={16} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : searchFilter.trim() === lastSearchedTerm && searchFilter.trim().length >= 2 && !loading ? (
          <div className="empty-state">
            <Truck size={48} className="empty-icon" />
            <p>No records found matching your search.</p>
          </div>
        ) : (
          <div className="guest-welcome">
            <div className="welcome-card">
              <Package size={32} />
              <h3>Enter a details above to start</h3>
              <p>You can search for specific shipments to view their unloading status and proof photos.</p>
            </div>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content guest-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedRecord(null)}>
              <X size={20} />
            </button>

            <div className="modal-top">
              <Truck size={24} />
              <h2>Report: {selectedRecord.vehicleNumber}</h2>
            </div>

            <div className="modal-meta-guest">
              <div className="m-item">
                <Calendar size={14} />
                <span>{new Date(selectedRecord.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <div className="m-item">
                <User size={14} />
                <span>Unloaded by {selectedRecord.employee?.name || 'Authorized Staff'}</span>
              </div>
            </div>

            <h3 className="section-title">Vendors & Proof Photos</h3>
            <div className="table-wrapper">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID</th>
                    <th>Vendor Name</th>
                    <th>Invoices</th>
                    <th>Photos</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.vendors?.map((v, i) => (
                    <tr 
                      key={i} 
                      className={v.images?.length > 0 ? 'clickable-row' : ''}
                      onClick={() => v.images?.length > 0 && openLightbox(v.images, 0)}
                      style={{ cursor: v.images?.length > 0 ? 'pointer' : 'default' }}
                    >
                      <td>{i + 1}</td>
                      <td><span className="id-badge-modern mini">{v.vendorId}</span></td>
                      <td>{v.vendorName}</td>
                      <td>{v.invoiceCount}</td>
                      <td>
                        <div className="photo-thumbs">
                          {v.images?.map((img, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={img}
                              alt="Proof"
                              className="guest-thumb"
                            />
                          ))}
                          {(!v.images || v.images.length === 0) && <span className="no-imgs">No Photos</span>}
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
          <button className="lightbox-close" onClick={closeLightbox}><X size={24} /></button>
          <div className="lightbox-body" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-controls">
              <button onClick={() => setLightbox(p => ({ ...p, zoom: Math.min(p.zoom + 0.25, 3) }))}><ZoomIn size={20} /></button>
              <button onClick={() => setLightbox(p => ({ ...p, zoom: Math.max(p.zoom - 0.25, 0.5) }))}><ZoomOut size={20} /></button>
              <button onClick={() => setLightbox(p => ({ ...p, rotate: (p.rotate + 90) % 360 }))}><RotateCw size={20} /></button>
              <button onClick={() => setLightbox(p => ({ ...p, zoom: 1, rotate: 0, position: { x: 0, y: 0 } }))}><RefreshCcw size={20} /></button>
            </div>
            {lightbox.images.length > 1 && (
              <button className="lightbox-nav lightbox-prev" onClick={lightboxPrev}><ChevronLeft size={28} /></button>
            )}
            <div className="lightbox-image-container" onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
              <img src={lightbox.images[lightbox.index]} alt="Proof" className="lightbox-image" onMouseDown={handleDragStart} onTouchStart={handleDragStart} style={{ transform: `translate(${lightbox.position.x}px, ${lightbox.position.y}px) scale(${lightbox.zoom}) rotate(${lightbox.rotate}deg)` }} />
            </div>
            {lightbox.images.length > 1 && (
              <button className="lightbox-nav lightbox-next" onClick={lightboxNext}><ChevronRight size={28} /></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestSearch;
