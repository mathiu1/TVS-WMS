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
  upload.array('images', 10),
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

      // Get image paths (relative for URL serving)
      const imagePaths = req.files.map(
        (file) => `/uploads/parts/${file.filename}`
      );

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

// @route   GET /api/unloading
// @desc    Get all unloading records (with optional filters)
// @access  Private (employee gets own, manager gets all)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, invoiceNumber, date } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};

    // Employees can only see their own records
    if (req.user.role === 'employee') {
      query.employee = req.user.id;
    }

    if (invoiceNumber) {
      query.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };
    }

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: dayStart, $lte: dayEnd };
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

module.exports = router;
