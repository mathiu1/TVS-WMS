import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { unloadingAPI } from '../api/axios';
import {
  PackagePlus,
  Plus,
  Trash2,
  Upload,
  X,
  Truck,
  Users,
  Camera,
  CheckCircle,
  Image as ImageIcon,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import SmartDropdown from '../components/SmartDropdown';
import ImageEditor from '../components/ImageEditor';

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
  const [suggestions, setSuggestions] = useState({ vehicle: [], vendor: [], location: [] });
  const [photoSheet, setPhotoSheet] = useState({ isOpen: false, vendorIndex: null });
  const [editPhoto, setEditPhoto] = useState({ isOpen: false, vendorIndex: null, imageIndex: null, file: null });

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

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await unloadingAPI.getSuggestions();
        if (res.data.success) {
          setSuggestions(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    };
    fetchSuggestions();
  }, []);

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

    if (vendor.files.length + vendor.previews.filter(p => p.name === 'existing').length + rawFiles.length > 6) {
      toast.error('Maximum 6 images allowed per vendor.');
      rawFiles = rawFiles.slice(0, Math.max(0, 6 - (vendor.files.length + vendor.previews.filter(p => p.name === 'existing').length)));
      if (rawFiles.length === 0) return;
    }


    const validFiles = rawFiles.filter((f) => {
      if (!['image/jpeg', 'image/png'].includes(f.type)) {
        toast.error(`${f.name}: Only JPG and PNG allowed`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: Max size is 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const toastId = toast.loading('Compressing images...');

    try {
      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        initialQuality: 0.8
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
      const previewsToProcess = [...compressedFiles];
      const newPreviews = await Promise.all(
        previewsToProcess.map(async (file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ name: file.name, url: e.target.result });
            reader.readAsDataURL(file);
          });
        })
      );

      const startIndexForEditing = updatedVendors[index].previews.length;
      updatedVendors[index].previews = [...vendor.previews, ...newPreviews];
      setVendors(updatedVendors);
      toast.success('Images uploaded!', { id: toastId });

      // Live Edit: Automatically open editor for the first newly added image
      if (compressedFiles.length > 0) {
        setEditPhoto({
          isOpen: true,
          vendorIndex: index,
          imageIndex: startIndexForEditing,
          file: compressedFiles[0]
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Processing failed', { id: toastId });
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

  const openPhotoSheet = (index) => {
    setPhotoSheet({ isOpen: true, vendorIndex: index });
  };

  const triggerGallery = () => {
    document.getElementById('gallery-input-hidden').click();
    setPhotoSheet({ ...photoSheet, isOpen: false });
  };

  const triggerCamera = () => {
    document.getElementById('camera-input-hidden').click();
    setPhotoSheet({ ...photoSheet, isOpen: false });
  };

  const startEditing = (vendorIdx, imgIdx) => {
    const vendor = vendors[vendorIdx];
    const file = vendor.files[imgIdx];
    if (!file) {
      toast.error('Only newly uploaded photos can be edited.');
      return;
    }
    setEditPhoto({ isOpen: true, vendorIndex: vendorIdx, imageIndex: imgIdx, file });
  };

  const handleSaveEdited = async (editedFile) => {
    const { vendorIndex, imageIndex } = editPhoto;
    const updatedVendors = [...vendors];
    const vendor = { ...updatedVendors[vendorIndex] };

    // Replace file
    const newFiles = [...vendor.files];
    newFiles[imageIndex] = editedFile;
    vendor.files = newFiles;

    // Update preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const newPreviews = [...vendor.previews];
      newPreviews[imageIndex] = { name: editedFile.name, url: e.target.result };
      vendor.previews = newPreviews;
      updatedVendors[vendorIndex] = vendor;
      setVendors(updatedVendors);
      setEditPhoto({ isOpen: false, vendorIndex: null, imageIndex: null, file: null });
      toast.success('Edits saved!');
    };
    reader.readAsDataURL(editedFile);
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
      v.partsCount < 1
    );

    if (missingFields) {
      toast.error('Please ensure all vendors have Name, Location, and at least 1 Invoice & 1 Part recorded.');
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
          <SmartDropdown
            placeholder="Vehicle Number"
            value={form.vehicleNumber}
            suggestions={suggestions.vehicle}
            icon={Truck}
            onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
            required
          />
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
                  <SmartDropdown
                    placeholder="Vendor Name"
                    value={v.vendorName}
                    suggestions={suggestions.vendor}
                    onChange={(e) => handleVendorChange(index, 'vendorName', e.target.value)}
                    required
                  />
                </div>
                <div className="col-location">
                  <label className="mobile-label">Location</label>
                  <SmartDropdown
                    placeholder="Location"
                    value={v.storageLocation}
                    suggestions={suggestions.location}
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
                  <button
                    type="button"
                    className="vendor-row-action-btn"
                    onClick={() => openPhotoSheet(index)}
                    title="Add Photo"
                  >
                    <ImageIcon size={16} className={v.previews.length > 0 ? 'text-primary' : ''} />
                    <span>Photo</span>
                  </button>

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
                        <div className="preview-controls">
                          <button
                            type="button"
                            onClick={() => startEditing(index, imgIdx)}
                            className="preview-edit-btn"
                            title="Edit Image"
                          >
                            <Pencil size={8} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(index, imgIdx)}
                            className="preview-remove-v3"
                            title="Remove Image"
                          >
                            <X size={8} />
                          </button>
                        </div>
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

      {/* Hidden Global File Inputs triggered by Action Sheet */}
      <input
        id="gallery-input-hidden"
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleImageChange(photoSheet.vendorIndex, e)}
      />
      <input
        id="camera-input-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleImageChange(photoSheet.vendorIndex, e)}
      />

      {/* Photo Option Action Sheet */}
      {photoSheet.isOpen && (
        <div className="photo-sheet-overlay" onClick={() => setPhotoSheet({ ...photoSheet, isOpen: false })}>
          <div className="photo-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="photo-sheet-header">
              <div className="photo-sheet-handle"></div>
              <h3>Add Photo</h3>
              <p>Choose an option to attach proof</p>
            </div>

            <div className="photo-sheet-options">
              <button className="photo-option-btn" onClick={triggerCamera}>
                <div className="option-icon camera">
                  <Camera size={24} />
                </div>
                <span>Take Photo</span>
              </button>

              <button className="photo-option-btn" onClick={triggerGallery}>
                <div className="option-icon gallery">
                  <ImageIcon size={24} />
                </div>
                <span>From Gallery</span>
              </button>
            </div>

            <button className="photo-sheet-cancel" onClick={() => setPhotoSheet({ ...photoSheet, isOpen: false })}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      {editPhoto.isOpen && (
        <ImageEditor
          imageFile={editPhoto.file}
          onSave={handleSaveEdited}
          onClose={() => setEditPhoto({ isOpen: false, vendorIndex: null, imageIndex: null, file: null })}
        />
      )}

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
