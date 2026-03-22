import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { unloadingAPI } from '../api/axios';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Package, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCcw,
  Warehouse
} from 'lucide-react';
import ModernLoader from '../components/ModernLoader';

const PublicRecordView = () => {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
    const fetchRecord = async () => {
      try {
        setLoading(true);
        const res = await unloadingAPI.publicGetById(id);
        setRecord(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Record not found or access denied.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

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
    setLightbox(prev => ({
      ...prev,
      index: (prev.index - 1 + prev.images.length) % prev.images.length,
      zoom: 1, rotate: 0, position: { x: 0, y: 0 }
    }));
  };

  const lightboxNext = () => {
    setLightbox(prev => ({
      ...prev,
      index: (prev.index + 1) % prev.images.length,
      zoom: 1, rotate: 0, position: { x: 0, y: 0 }
    }));
  };

  if (loading) return <ModernLoader message="Verifying record details..." fullPage />;
  
  if (error) return (
    <div className="public-error-container">
      <div className="error-card">
        <X size={48} className="error-icon" />
        <h2>Access Denied</h2>
        <p>{error}</p>
        <Link to="/guest" className="btn btn-primary">Go to Guest Search</Link>
      </div>
    </div>
  );

  return (
    <div className="public-record-container">
      <div className="public-header-brand">
        <div className="brand-inner">
          <Warehouse size={32} className="brand-icon" />
          <div className="brand-text">
            <h1>TVS Warehouse</h1>
            <p>Verification Portal</p>
          </div>
        </div>
      </div>

      <div className="public-content">
        <div className="record-main-card">
          <div className="record-header-strip">
            <div className="vehicle-badge">
              <Truck size={20} />
              <span>{record?.vehicleNumber}</span>
            </div>
            <div className="date-badge">
              <Calendar size={14} />
              <span>{record ? new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</span>
            </div>
          </div>

          <div className="record-quick-meta">
            <div className="meta-item">
              <MapPin size={16} />
              <span>{record?.locationName || 'Main Gate'}</span>
            </div>
            <div className="meta-item">
              <Package size={16} />
              <span>{record?.vendors?.length || 0} Vendors Unloaded</span>
            </div>
          </div>

          <div className="vendors-list-public">
            <h3>Inventory Details</h3>
            {record?.vendors?.map((vendor, idx) => (
              <div key={idx} className="vendor-item-card">
                <div className="vendor-item-header">
                  <div className="v-id">
                    <span className="badge-id">{vendor.vendorId}</span>
                    <h4>{vendor.vendorName}</h4>
                  </div>
                  <div className="v-stats">
                    <span>{vendor.invoiceCount} Invoices</span>
                    <span className="dot"></span>
                    <span>{vendor.partsCount} Parts</span>
                  </div>
                </div>
                
                <div className="vendor-loc">
                  <MapPin size={12} />
                  <span>Stored at: {vendor.storageLocation || 'Unassigned'}</span>
                </div>

                {vendor.images?.length > 0 && (
                  <div className="vendor-gallery">
                    {vendor.images.map((img, imgIdx) => (
                      <div 
                        key={imgIdx} 
                        className="thumb-wrapper"
                        onClick={() => openLightbox(vendor.images, imgIdx)}
                      >
                        <img src={img} alt="Proof" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="public-footer">
          <p>© {new Date().getFullYear()} TVS Store Logistics. All rights reserved.</p>
        </div>
      </div>

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
            <div className="lightbox-image-container">
              <img src={lightbox.images[lightbox.index]} alt="Proof" className="lightbox-image" style={{ transform: `scale(${lightbox.zoom}) rotate(${lightbox.rotate}deg)` }} />
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

export default PublicRecordView;
