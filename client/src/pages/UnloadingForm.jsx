import { useState } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

const emptyPart = { partNumber: '', quantity: 1 };

const UnloadingForm = ({ editData = null, onSuccess = null }) => {
  const [form, setForm] = useState({
    invoiceNumber: editData?.invoiceNumber || '',
    locationName: editData?.locationName || '',
  });
  const [parts, setParts] = useState(editData?.parts || [{ ...emptyPart }]);
  
  // For edit mode, we pre-fill previews with existing images, 
  // but if new images are selected, we know it's a replacement.
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState(
    editData?.images ? editData.images.map((url) => ({ name: 'existing', url })) : []
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form field handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Parts handlers
  const handlePartChange = (index, field, value) => {
    const updated = [...parts];
    updated[index][field] = field === 'quantity' ? parseInt(value) || 1 : value;
    setParts(updated);
  };

  const addPart = () => {
    setParts([...parts, { ...emptyPart }]);
  };

  const removePart = (index) => {
    if (parts.length === 1) return;
    setParts(parts.filter((_, i) => i !== index));
  };

  // Image handlers
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((f) => {
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

    setImages((prev) => [...prev, ...validFiles]);

    // Generate previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, { name: file.name, url: e.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    // If it's an existing image (from editMode), we just remove it from previews.
    // The backend won't keep it unless it's sent, but currently the API expects all new images if updated.
    // For simplicity, if they remove ANY image in edit mode, they must re-upload what they want.
    if (previews[index]?.name === 'existing') {
        toast('In edit mode, removing an image requires you to re-upload all proof images.', { icon: 'ℹ️' });
    }
    
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editData && images.length === 0) {
      toast.error('Please upload at least one proof image.');
      return;
    }
    // In edit mode, if no NEW images are uploaded, and they haven't cleared the existing ones, we let it pass.
    if (editData && images.length === 0 && previews.length === 0) {
        toast.error('Please upload at least one proof image.');
        return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('invoiceNumber', form.invoiceNumber);
      formData.append('locationName', form.locationName);
      formData.append('parts', JSON.stringify(parts));

      if (images.length > 0) {
        images.forEach((img) => {
          formData.append('images', img);
        });
      }

      if (editData) {
        // Only send images if they actually uploaded new ones. 
        // Our backend expects images to be replaced entirely if the 'images' field is present.
        await unloadingAPI.update(editData._id, formData);
        toast.success('Unloading record updated successfully!');
        if (onSuccess) onSuccess();
      } else {
        await unloadingAPI.create(formData);
        toast.success('Unloading record submitted successfully!');
        setSuccess(true);
        setForm({ invoiceNumber: '', locationName: '' });
        setParts([{ ...emptyPart }]);
        setImages([]);
        setPreviews([]);
        setTimeout(() => setSuccess(false), 3000);
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
          <PackagePlus size={28} />
          <div>
            <h1>Vehicle Unloading</h1>
            <p>Record parts received from vendor vehicle</p>
          </div>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>Record submitted successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="unloading-form">
        {/* Invoice & Location */}
        <div className="form-card">
          <h2 className="form-card-title">
            <FileText size={20} />
            Invoice Details
          </h2>
          <div className="form-grid">
            <div className="input-group">
              <FileText size={18} className="input-icon" />
              <input
                id="invoice-number"
                type="text"
                name="invoiceNumber"
                placeholder="Invoice Number"
                value={form.invoiceNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <MapPin size={18} className="input-icon" />
              <input
                id="location-name"
                type="text"
                name="locationName"
                placeholder="Storage Location Name"
                value={form.locationName}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        {/* Parts List */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">
              <PackagePlus size={20} />
              Parts List
            </h2>
            <button type="button" onClick={addPart} className="btn btn-sm btn-secondary">
              <Plus size={16} /> Add Part
            </button>
          </div>

          <div className="parts-list">
            <div className="parts-list-header">
              <span className="col-index">#</span>
              <span className="col-part">Part Number *</span>
              <span className="col-qty">Quantity *</span>
              <span className="col-action"></span>
            </div>
            {parts.map((part, index) => (
              <div key={index} className="part-row">
                <span className="part-index">{index + 1}</span>
                <input
                  type="text"
                  placeholder="Part Number *"
                  value={part.partNumber}
                  onChange={(e) => handlePartChange(index, 'partNumber', e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={part.quantity}
                  onChange={(e) => handlePartChange(index, 'quantity', e.target.value)}
                  required
                  min={1}
                  className="qty-input"
                />
                <button
                  type="button"
                  onClick={() => removePart(index)}
                  className="btn-icon btn-danger"
                  disabled={parts.length === 1}
                  title="Remove part"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Image Upload */}
        <div className="form-card">
          <h2 className="form-card-title">
            <ImageIcon size={20} />
            Proof Images
          </h2>

          <label htmlFor="image-upload" className="upload-zone">
            <Upload size={32} />
            <span>Click or drag images here</span>
            <small>JPG, PNG only • Max 5MB each</small>
            <input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handleImageChange}
              className="hidden-input"
            />
          </label>

          {previews.length > 0 && (
            <div className="image-previews">
              {previews.map((preview, index) => (
                <div key={index} className="preview-card">
                  <img src={preview.url} alt={`Preview ${index + 1}`} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="preview-remove"
                  >
                    <X size={14} />
                  </button>
                  <span className="preview-name">{preview.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary submit-btn"
          disabled={loading || parts.some((p) => !p.partNumber || p.quantity < 1)}
        >
          {loading ? (
            <div className="loader-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
          ) : (
            <>
              <CheckCircle size={20} />
              {editData ? 'Save Changes' : 'Submit Unloading Record'}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default UnloadingForm;
