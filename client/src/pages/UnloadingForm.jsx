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

const UnloadingForm = () => {
  const [form, setForm] = useState({
    invoiceNumber: '',
    locationName: '',
  });
  const [parts, setParts] = useState([{ ...emptyPart }]);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
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
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (images.length === 0) {
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

      images.forEach((img) => {
        formData.append('images', img);
      });

      await unloadingAPI.create(formData);

      toast.success('Unloading record submitted successfully!');
      setSuccess(true);

      // Reset form
      setForm({ invoiceNumber: '', locationName: '' });
      setParts([{ ...emptyPart }]);
      setImages([]);
      setPreviews([]);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit record.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <PackagePlus size={28} />
        <div>
          <h1>Vehicle Unloading</h1>
          <p>Record parts received from vendor vehicle</p>
        </div>
      </div>

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
          id="submit-unloading"
          type="submit"
          className="btn btn-primary btn-full btn-lg"
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading">Submitting Record...</span>
          ) : (
            <>
              <CheckCircle size={20} />
              Submit Unloading Record
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default UnloadingForm;
