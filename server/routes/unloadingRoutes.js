const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const upload = require('../middleware/upload');
const UnloadingRecord = require('../models/UnloadingRecord');

const router = express.Router();

// @route   POST /api/unloading
// @desc    Create a new unloading record (Employee only)
// @access  Private (employee)
router.post(
  '/',
  auth,
  authorize('employee'),
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
      const { invoiceNumber, locationName, parts, vehicle } = req.body;

      // Validate images were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one proof image is required.',
        });
      }

      // Parse parts if it's a JSON string
      let parsedParts;
      try {
        parsedParts = typeof parts === 'string' ? JSON.parse(parts) : parts;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parts data format. Must be a valid JSON array.',
        });
      }

      // Get image paths (secure URLs from Cloudinary)
      const imagePaths = req.files.map((file) => file.path);

      const record = await UnloadingRecord.create({
        invoiceNumber,
        locationName,
        parts: parsedParts,
        images: imagePaths,
        employee: req.user.id,
        vehicle: vehicle || undefined,
      });

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

// @route   GET /api/unloading/stats
// @desc    Get unloading statistics (today, week, month)
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const { scope } = req.query;
    const query = {};

    // Filter by employee if not manager or if scope is not 'all'
    if (req.user.role === 'employee' && scope !== 'all') {
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

// @route   GET /api/unloading
// @desc    Get all unloading records (with optional filters)
// @access  Private (employee gets own, manager gets all)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 15, invoiceNumber, startDate, endDate, scope } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};

    // By default, employees see their own. If scope=all, they see all (as requested)
    if (req.user.role === 'employee' && scope !== 'all') {
      query.employee = req.user.id;
    }

    if (invoiceNumber) {
      query.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [records, total] = await Promise.all([
      UnloadingRecord.find(query)
        .populate('employee', 'name email')
        .populate('vehicle', 'vehicleNumber vendorName')
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
      .populate('employee', 'name email')
      .populate('vehicle', 'vehicleNumber vendorName');

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

    // Parse parts if it's a JSON string
    if (req.body.parts && typeof req.body.parts === 'string') {
      try {
        req.body.parts = JSON.parse(req.body.parts);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parts data format. Must be a valid JSON array.',
        });
      }
    }

    // Process new images if any are uploaded
    if (req.files && req.files.length > 0) {
      const imagePaths = req.files.map((file) => file.path);
      req.body.images = imagePaths;
    }

    // Update fields
    const updatedRecord = await UnloadingRecord.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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

module.exports = router;
