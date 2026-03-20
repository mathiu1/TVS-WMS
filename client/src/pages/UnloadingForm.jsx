import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { unloadingAPI } from '../api/axios';
import {
  PackagePlus,
  Plus,
  Trash2,
  Upload,
  X,
  CheckCircle,
  Image as ImageIcon,
  FileText,
  MapPin,
  Truck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

const emptyVendor = {
  vendorName: '',
  invoiceCount: 1,
  partsCount: 0,
  storageLocation: '',
  files: [],    // New: per-vendor File objects
  previews: [], // New: per-vendor preview URLs
  images: []    // Existing Cloudinary URLs
};

const UnloadingForm = ({ editData = null, onSuccess = null }) => {
  const [form, setForm] = useState({
    vehicleNumber: editData?.vehicleNumber || '',
    locationName: editData?.locationName || '',
  });

  const [vendors, setVendors] = useState(
    editData?.vendors?.map(v => ({
      ...v,
      files: [],
      previews: v.images ? v.images.map(url => ({ name: 'existing', url })) : []
    })) || [{ ...emptyVendor }]
  );

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedVendors, setSubmittedVendors] = useState([]);

  const navigate = useNavigate();

  // Form field handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleVendorChange = (index, field, value) => {
    const updated = [...vendors];
    if (field === 'invoiceCount' || field === 'partsCount') {
      updated[index][field] = value === '' ? '' : parseInt(value);
    } else {
      updated[index][field] = value;
    }
    setVendors(updated);
  };

  const addVendor = () => {
    setVendors([...vendors, { ...emptyVendor }]);
  };

  const removeVendor = (index) => {
    if (vendors.length === 1) return;
    setVendors(vendors.filter((_, i) => i !== index));
  };

  // Image handlers (Per Vendor)
  const handleImageChange = async (index, e) => {
    let rawFiles = Array.from(e.target.files);
    const vendor = vendors[index];

    if (vendor.files.length + vendor.previews.filter(p => p.name === 'existing').length + rawFiles.length > 3) {
      toast.error('Maximum 3 images allowed per vendor.');
      rawFiles = rawFiles.slice(0, Math.max(0, 3 - (vendor.files.length + vendor.previews.filter(p => p.name === 'existing').length)));
      if (rawFiles.length === 0) return;
    }

    const validFiles = rawFiles.filter((f) => {
      if (!['image/jpeg', 'image/png'].includes(f.type)) {
        toast.error(`${f.name}: Only JPG and PNG allowed`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: Max size is 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const toastId = toast.loading('Compressing images...');

    try {
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        initialQuality: 0.9
      };

      const compressedFiles = await Promise.all(
        validFiles.map(async (file) => {
          try {
            const compressedBlob = await imageCompression(file, options);
            return new File([compressedBlob], file.name, { type: compressedBlob.type });
          } catch (error) {
            console.error('Compression error:', error);
            return file;
          }
        })
      );

      const updatedVendors = [...vendors];
      updatedVendors[index] = {
        ...vendor,
        files: [...vendor.files, ...compressedFiles]
      };

      // Generate previews
      const newPreviews = await Promise.all(compressedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ name: file.name, url: e.target.result });
          reader.readAsDataURL(file);
        });
      }));

      updatedVendors[index].previews = [...updatedVendors[index].previews, ...newPreviews];
      setVendors(updatedVendors);

      toast.success('Images added to vendor!', { id: toastId });
    } catch (err) {
      toast.error('Failed to process images', { id: toastId });
    }
  };

  const removeImage = (vendorIdx, imageIdx) => {
    const updated = vendors.map((v, vIdx) => {
      if (vIdx !== vendorIdx) return v;

      const newVendor = { ...v };
      const preview = newVendor.previews[imageIdx];

      if (preview.name === 'existing') {
        newVendor.images = (newVendor.images || []).filter(url => url !== preview.url);
        toast('Existing image removed. Save to apply changes.', { icon: 'ℹ️' });
      } else {
        const fileName = preview.name;
        newVendor.files = (newVendor.files || []).filter(f => f.name !== fileName);
      }

      newVendor.previews = newVendor.previews.filter((_, i) => i !== imageIdx);
      return newVendor;
    });

    setVendors(updated);
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    const vehicleRegex = /^[A-Z]{2}[ -]?[0-9]{1,2}(?:[ -]?[A-Z]{1,2})?[ -]?[0-9]{4}$/i;
    if (!vehicleRegex.test(form.vehicleNumber)) {
      toast.error('Invalid Vehicle Number format (e.g. TN 21 BS 3133)');
      return;
    }

    // Ensure all vendor fields have values
    const missingFields = vendors.some(v => 
      !v.vendorName.trim() || 
      !v.storageLocation.trim() || 
      v.invoiceCount < 1 || 
      v.partsCount < 0
    );

    if (missingFields) {
      toast.error('Please fill all mandatory vendor fields (Name, Location, Invoices, Parts)');
      return;
    }

    // Custom validation: At least one image per vendor? Or just globally?
    const missingImages = vendors.some(v => v.files.length === 0 && v.previews.filter(p => p.name === 'existing').length === 0);

    if (!editData && missingImages) {
      toast.error('Please upload at least one proof image for each vendor.');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('vehicleNumber', form.vehicleNumber);
      formData.append('locationName', form.locationName);

      // We'll flatten all files into a single array and keep track of indices
      let allFiles = [];
      const vendorsToSubmit = vendors.map(vendor => {
        const startIndex = allFiles.length;
        allFiles = [...allFiles, ...vendor.files];
        const endIndex = allFiles.length;

        // Create an array of indices [0, 1, 2...] for the current files
        const imageIndices = Array.from(
          { length: endIndex - startIndex },
          (_, i) => startIndex + i
        );

        // Remove files/previews from the JSON object sent to server
        const { files, previews, ...rest } = vendor;
        return {
          ...rest,
          imageIndices
        };
      });

      formData.append('vendors', JSON.stringify(vendorsToSubmit));

      if (allFiles.length > 0) {
        allFiles.forEach((file) => {
          formData.append('images', file);
        });
      }

      if (editData) {
        await unloadingAPI.update(editData._id, formData);
        toast.success('Record updated successfully!');
        if (onSuccess) onSuccess();
        setTimeout(() => navigate('/records'), 1500);
      } else {
        const response = await unloadingAPI.create(formData);
        if (response.data.success) {
          toast.success('Vehicle unloading recorded successfully!');
          setSubmittedVendors(response.data.data.vendors);
          setShowSuccessModal(true);
          setForm({ vehicleNumber: '', locationName: '' });
          setVendors([{ ...emptyVendor }]);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit record.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={editData ? '' : 'page-container'}>
      {!editData && (
        <div className="page-header">
          <div className="header-title-container">
            <div className="summary-icon blue">
              <Truck size={28} />
            </div>
            <div className="header-text">
              <h1>Vehicle Unloading</h1>
              <p>Record unloading operations by vehicle sessions</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>Vehicle data recorded successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="unloading-form">
        {/* Vehicle Card */}
        <div className="form-card">
          <h2 className="form-card-title">
            <Truck size={20} />
            Vehicle Details
          </h2>
          <div className="input-group">
            <Truck size={18} className="input-icon" />
            <input
              id="vehicle-number"
              type="text"
              name="vehicleNumber"
              placeholder="Vehicle Number (e.g. TN 21 BS 3133)"
              value={form.vehicleNumber}
              onChange={handleChange}
              required
              className="premium-input-large"
            />
          </div>
        </div>

        {/* Vendors List Card */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">
              <Users size={20} />
              Vendors & Inventory
            </h2>
            <button type="button" onClick={addVendor} className="btn btn-sm btn-secondary">
              <Plus size={16} /> Add Vendor
            </button>
          </div>

          <div className="parts-list">
            <div className="parts-list-header">
              <span className="col-index">#</span>
              <span className="col-part">Vendor Name *</span>
              <span className="col-loc">Location *</span>
              <span className="col-qty">Invoices *</span>
              <span className="col-qty">Parts *</span>
              <span className="col-action">Actions</span>
            </div>
            {vendors.map((v, index) => (
              <div key={index} className="part-row">
                <span className="part-index">{index + 1}</span>
                <div className="col-vendor">
                  <label className="mobile-label">Vendor Name</label>
                  <input
                    type="text"
                    placeholder="Vendor Name"
                    value={v.vendorName}
                    onChange={(e) => handleVendorChange(index, 'vendorName', e.target.value)}
                    required
                  />
                </div>
                <div className="col-location">
                  <label className="mobile-label">Location</label>
                  <input
                    type="text"
                    placeholder="Dock"
                    value={v.storageLocation}
                    onChange={(e) => handleVendorChange(index, 'storageLocation', e.target.value)}
                    required
                  />
                </div>
                <div className="col-invoices">
                  <label className="mobile-label">Invoices</label>
                  <input
                    type="number"
                    placeholder="Inv"
                    value={v.invoiceCount}
                    onChange={(e) => handleVendorChange(index, 'invoiceCount', e.target.value)}
                    required
                    min={1}
                  />
                </div>
                <div className="col-parts">
                  <label className="mobile-label">Parts</label>
                  <input
                    type="number"
                    placeholder="Parts"
                    value={v.partsCount}
                    onChange={(e) => handleVendorChange(index, 'partsCount', e.target.value)}
                    required
                    min={0}
                  />
                </div>
                <div className="col-action-group">
                  <label className="vendor-row-action" title="Add Photo">
                    <ImageIcon size={16} className={v.previews.length > 0 ? 'text-primary' : ''} />
                    <span>Photo</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      onChange={(e) => handleImageChange(index, e)}
                      className="hidden-file-input"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => removeVendor(index)}
                    className="btn-icon btn-danger"
                    disabled={vendors.length === 1}
                    title="Remove Vendor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Vendor Mini-Gallery */}
                {v.previews.length > 0 && (
                  <div className="vendor-previews">
                    {v.previews.map((preview, imgIdx) => (
                      <div key={imgIdx} className="preview-mini-v3">
                        <img src={preview.url} alt="Proof" />
                        <button
                          type="button"
                          onClick={() => removeImage(index, imgIdx)}
                          className="preview-remove-v3"
                        >
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary submit-btn-v2"
          disabled={loading || !form.vehicleNumber || vendors.some((v) => !v.vendorName || !v.storageLocation)}
        >
          {loading ? (
            <div className="loader-spinner-white" />
          ) : (
            <>
              <CheckCircle size={20} />
              {editData ? 'Update Record' : 'Submit Unloading Detail'}
            </>
          )}
        </button>
    </form>

    {/* Success Modal */}
    {showSuccessModal && (
      <div className="success-modal-backdrop">
        <div className="success-modal-content">
          <div className="success-icon-wrapper">
            <CheckCircle size={48} />
          </div>
          <h3>Submission Successful!</h3>
          <p>The unloading record has been saved. Please note the Unique IDs below.</p>
          
          <div className="vendor-id-list">
            {submittedVendors.map((vendor, idx) => (
              <div key={idx} className="vendor-id-item">
                <span className="vendor-id-name">{vendor.vendorName}</span>
                <span className="vendor-id-badge">{vendor.vendorId}</span>
              </div>
            ))}
          </div>
          
          <button 
            className="btn btn-primary w-full"
            style={{ padding: '1rem', borderRadius: '12px', fontWeight: '800' }}
            onClick={() => {
              setShowSuccessModal(false);
              onSuccess && onSuccess();
              navigate('/records');
            }}
          >
            Done
          </button>
        </div>
      </div>
    )}
  </div>
);
};

export default UnloadingForm;
