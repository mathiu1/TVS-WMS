const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const upload = require('../middleware/upload');
const UnloadingRecord = require('../models/UnloadingRecord');
const Counter = require('../models/Counter');
const AutocompleteOption = require('../models/AutocompleteOption');
const User = require('../models/User'); 

const router = express.Router();

// Helper to get formatted next vendor ID
const getNextVendorId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { id: 'vendorId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = counter.seq.toString();
  // If less than 4 digits, pad with zeros
  if (seqStr.length < 4) {
    return seqStr.padStart(4, '0');
  }
  return seqStr;
};

// Helper to update autocomplete suggestions
const updateSuggestions = async (vehicleNumber, vendors) => {
  try {
    const options = [];

    if (vehicleNumber) {
      options.push({ type: 'vehicle', value: vehicleNumber.toUpperCase() });
    }

    if (vendors && Array.isArray(vendors)) {
      vendors.forEach(v => {
        if (v.vendorName) options.push({ type: 'vendor', value: v.vendorName });
        if (v.storageLocation) options.push({ type: 'location', value: v.storageLocation });
      });
    }

    if (options.length === 0) return;

    // Use bulkWrite for efficiency and to skip existing duplicates
    const operations = options.map(opt => ({
      updateOne: {
        filter: { type: opt.type, value: opt.value },
        update: { $set: opt },
        upsert: true
      }
    }));

    await AutocompleteOption.bulkWrite(operations);
  } catch (err) {
    console.error('Failed to update autocomplete suggestions:', err);
  }
};

// @route   POST /api/unloading
// @desc    Create a new unloading record (Employee only)
// @access  Private (employee)
router.post(
  '/',
  auth,
  authorize('employee', 'manager'),
  function (req, res, next) {
    const uploadMiddleware = upload.array('images', 10);
    uploadMiddleware(req, res, function (err) {
      if (err) {
        return res.status(400).json({
          success: false,
          message: `Upload Error: ${err.message}`,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { vehicleNumber, locationName, vendors } = req.body;

      // Validate images were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one proof image is required.',
        });
      }

      // Parse vendors if it's a JSON string
      let parsedVendors;
      try {
        parsedVendors = typeof vendors === 'string' ? JSON.parse(vendors) : vendors;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendors data format. Must be a valid JSON array.',
        });
      }

      // Get image paths (secure URLs from Cloudinary)
      const imagePaths = req.files.map((file) => file.path);

      // Map images to vendors and generate unique IDs
      const vendorsWithMetadata = await Promise.all(parsedVendors.map(async (vendor, index) => {
        const vendorImages = vendor.imageIndices 
          ? vendor.imageIndices.map(idx => imagePaths[idx]).filter(path => !!path)
          : [];

        // Generate sequential Vendor ID
        const vendorId = await getNextVendorId();

        return {
          ...vendor,
          vendorId,
          images: vendorImages
        };
      }));

      const record = await UnloadingRecord.create({
        vehicleNumber,
        locationName,
        vendors: vendorsWithMetadata,
        employee: req.user.id,
      });

      // Background: Update autocomplete suggestions
      updateSuggestions(vehicleNumber, parsedVendors);

      // Populate employee info before sending response
      await record.populate('employee', 'name email');

      res.status(201).json({
        success: true,
        message: 'Unloading record created successfully.',
        data: record,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// @route   GET /api/unloading/suggestions
// @desc    Get autocomplete suggestions for vehicle, vendor, and location
// @access  Private
router.get('/suggestions', auth, async (req, res) => {
  try {
    const options = await AutocompleteOption.find().select('type value -_id');
    
    const suggestions = {
      vehicle: [],
      vendor: [],
      location: []
    };

    options.forEach(opt => {
      if (suggestions[opt.type]) {
        suggestions[opt.type].push(opt.value);
      }
    });

    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/unloading/sync-suggestions
// @desc    Force sync suggestions from all existing records
// @access  Private (Manager only)
router.post('/sync-suggestions', auth, authorize('manager'), async (req, res) => {
  try {
    const records = await UnloadingRecord.find();
    console.log(`Syncing suggestions from ${records.length} records...`);

    const options = new Map(); // Use map for local de-duping

    records.forEach(r => {
      if (r.vehicleNumber) options.set(`vehicle:${r.vehicleNumber.toUpperCase()}`, { type: 'vehicle', value: r.vehicleNumber.toUpperCase() });
      if (r.vendors) {
        r.vendors.forEach(v => {
          if (v.vendorName) options.set(`vendor:${v.vendorName}`, { type: 'vendor', value: v.vendorName });
          if (v.storageLocation) options.set(`location:${v.storageLocation}`, { type: 'location', value: v.storageLocation });
        });
      }
    });

    const values = Array.from(options.values());
    if (values.length > 0) {
      const operations = values.map(opt => ({
        updateOne: {
          filter: { type: opt.type, value: opt.value },
          update: { $set: opt },
          upsert: true
        }
      }));
      await AutocompleteOption.bulkWrite(operations);
    }

    res.status(200).json({
      success: true,
      message: `Successfully synced ${values.length} unique suggestions.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// @desc    Get unloading statistics (today, week, month)
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const { scope } = req.query;
    const query = {};

    // Filter by employee if scope is 'mine' or if employee role and not scope 'all'
    if (scope === 'mine') {
      query.employee = req.user.id;
    } else if (req.user.role === 'employee' && scope !== 'all') {
      query.employee = req.user.id;
    }

    const now = new Date();
    
    // Today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // This Week (Starts Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    // This Month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayCount, weekCount, monthCount] = await Promise.all([
      UnloadingRecord.countDocuments({ ...query, createdAt: { $gte: todayStart } }),
      UnloadingRecord.countDocuments({ ...query, createdAt: { $gte: weekStart } }),
      UnloadingRecord.countDocuments({ ...query, createdAt: { $gte: monthStart } }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ... (previous helper functions remains)

// @route   GET /api/unloading
// @desc    Get all unloading records (with optional filters)
// @access  Private (employee gets own, manager gets all)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 15, vehicleNumber, startDate, endDate, scope } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};

    // Filter by employee if scope is 'mine' or if employee role and not scope 'all'
    if (scope === 'mine') {
      query.employee = req.user.id;
    } else if (req.user.role === 'employee' && scope !== 'all') {
      query.employee = req.user.id;
    }

    if (vehicleNumber) {
      // Find users matching naming pattern to search by employee
      const matchingUsers = await User.find({ 
        name: { $regex: vehicleNumber, $options: 'i' } 
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);

      const isNumericSearch = /^\d+$/.test(vehicleNumber);
      
      query.$or = [
        { 'vendors.vendorName': { $regex: vehicleNumber, $options: 'i' } },
        { 'vendors.vendorId': isNumericSearch 
            ? { $regex: `^0*${vehicleNumber}$` } 
            : { $regex: vehicleNumber, $options: 'i' } 
        },
        { employee: { $in: userIds } } // Add employee search
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      UnloadingRecord.find(query)
        .populate('employee', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      UnloadingRecord.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/unloading/:id
// @desc    Get a single unloading record
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await UnloadingRecord.findById(req.params.id)
      .populate('employee', 'name email');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
      });
    }

    // Employee can only view their own
    if (
      req.user.role === 'employee' &&
      record.employee._id.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/unloading/:id
// @desc    Update a single unloading record
// @access  Private
router.put(
  '/:id',
  auth,
  function (req, res, next) {
    const uploadMiddleware = upload.array('images', 10);
    uploadMiddleware(req, res, function (err) {
      if (err) {
        return res.status(400).json({
          success: false,
          message: `Upload Error: ${err.message}`,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const record = await UnloadingRecord.findById(req.params.id);

      if (!record) {
        return res.status(404).json({ success: false, message: 'Record not found.' });
      }

      // Role check: Only the owner (employee) or manager can update
      if (req.user.role === 'employee' && record.employee._id.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this record.' });
      }

      const { vehicleNumber, locationName, vendors } = req.body;

      // Parse vendors if it's a JSON string
      let parsedVendors = vendors;
      if (typeof vendors === 'string') {
        try {
          parsedVendors = JSON.parse(vendors);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Invalid vendors data format. Must be a valid JSON array.',
          });
        }
      }

      // Process new images if any are uploaded
      const newImagePaths = req.files ? req.files.map((file) => file.path) : [];

      // Update vendors with new images mapped by indices
      // We expect the frontend to send 'images' (existing urls) and 'imageIndices' (new uploads)
      const updatedVendors = parsedVendors.map((vendor) => {
        const existingImages = vendor.images || [];
        const newVendorImages = (vendor.imageIndices || [])
          .map(idx => newImagePaths[idx])
          .filter(path => !!path);
        
        return {
          ...vendor,
          images: [...existingImages, ...newVendorImages]
        };
      });

      // Update fields
      const updatedRecord = await UnloadingRecord.findByIdAndUpdate(
        req.params.id,
        { 
          $set: {
            vehicleNumber,
            locationName,
            vendors: updatedVendors
          } 
        },
        { new: true, runValidators: true }
      );

      // Background: Update autocomplete suggestions
      updateSuggestions(vehicleNumber, parsedVendors);

      res.status(200).json({ success: true, data: updatedRecord });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// @route   DELETE /api/unloading/:id
// @desc    Delete a single unloading record
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await UnloadingRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    // Role check: Only the owner (employee) or manager can delete
    if (req.user.role === 'employee' && record.employee._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this record.' });
    }

    await record.deleteOne();

    res.status(200).json({ success: true, message: 'Record removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/unloading/public/search
// @desc    Public search for unloading records (No Auth)
// @access  Public
router.get('/public/search', async (req, res) => {
  try {
    const { vehicleNumber } = req.query;
    
    // Prevent listing all records for security/privacy
    if (!vehicleNumber || vehicleNumber.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Please provide a search term (min 2 chars).'
      });
    }

    // Build query (Restrict to ID search only for public use)
    const isNumericSearch = /^\d+$/.test(vehicleNumber);
    const query = {
      'vendors.vendorId': isNumericSearch 
        ? { $regex: `^0*${vehicleNumber}$` } 
        : { $regex: vehicleNumber, $options: 'i' }
    };

    const records = await UnloadingRecord.find(query)
      .populate('employee', 'name') // Only return name, not email for privacy
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/unloading/public/:id
// @desc    Get a single unloading record publicly (No Auth)
// @access  Public
router.get('/public/:id', async (req, res) => {
  try {
    const record = await UnloadingRecord.findById(req.params.id)
      .populate('employee', 'name');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
