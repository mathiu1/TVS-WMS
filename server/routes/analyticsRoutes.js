const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const UnloadingRecord = require('../models/UnloadingRecord');

const router = express.Router();

// @route   GET /api/analytics/daily-report
// @desc    Get daily unloading report grouped by employee and date
// @access  Private (manager only)
router.get('/daily-report', auth, authorize('manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date match
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = end;
      }
    }

    const report = await UnloadingRecord.aggregate([
      // Stage 1: Filter by date range (if provided)
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),

      // Stage 2: Group by employee and date
      {
        $group: {
          _id: {
            employeeId: '$employee',
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
          },
          totalUnloaded: { $sum: 1 },
          invoices: { $push: '$invoiceNumber' },
          locations: { $addToSet: '$locationName' },
        },
      },

      // Stage 3: Lookup employee details
      {
        $lookup: {
          from: 'tvs_users',
          localField: '_id.employeeId',
          foreignField: '_id',
          as: 'employeeInfo',
        },
      },

      // Stage 4: Unwind employee info
      { $unwind: '$employeeInfo' },

      // Stage 5: Project clean output
      {
        $project: {
          _id: 0,
          employeeId: '$_id.employeeId',
          employeeName: '$employeeInfo.name',
          employeeEmail: '$employeeInfo.email',
          date: '$_id.date',
          totalUnloaded: 1,
          invoices: 1,
          locations: 1,
        },
      },

      // Stage 6: Sort by date descending, then employee name
      { $sort: { date: -1, employeeName: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/analytics/summary
// @desc    Get overall summary stats
// @access  Private (manager only)
router.get('/summary', auth, authorize('manager'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalRecords, todayRecords, totalEmployees] = await Promise.all([
      UnloadingRecord.countDocuments(),
      UnloadingRecord.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      UnloadingRecord.distinct('employee'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRecords,
        todayRecords,
        activeEmployees: totalEmployees.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/analytics/employee-reports
// @desc    Get per-employee report with date filtering (today/week/month/custom)
// @access  Private (manager only)
router.get('/employee-reports', auth, authorize('manager'), async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    // Build date range
    const now = new Date();
    let dateStart, dateEnd;

    switch (filter) {
      case 'today':
        dateStart = new Date(now);
        dateStart.setHours(0, 0, 0, 0);
        dateEnd = new Date(now);
        dateEnd.setHours(23, 59, 59, 999);
        break;
      case 'week': {
        dateStart = new Date(now);
        dateStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        dateStart.setHours(0, 0, 0, 0);
        dateEnd = new Date(now);
        dateEnd.setHours(23, 59, 59, 999);
        break;
      }
      case 'month':
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now);
        dateEnd.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (startDate) dateStart = new Date(startDate);
        if (endDate) {
          dateEnd = new Date(endDate);
          dateEnd.setHours(23, 59, 59, 999);
        }
        break;
      default:
        // All time — no date filter
        break;
    }

    const matchStage = {};
    if (dateStart) matchStage.createdAt = { $gte: dateStart };
    if (dateEnd) {
      matchStage.createdAt = matchStage.createdAt || {};
      matchStage.createdAt.$lte = dateEnd;
    }

    const report = await UnloadingRecord.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),

      // Group by employee
      {
        $group: {
          _id: '$employee',
          totalUnloads: { $sum: 1 },
          totalParts: { $sum: { $size: '$parts' } },
          locations: { $addToSet: '$locationName' },
          invoices: { $push: '$invoiceNumber' },
          lastActivity: { $max: '$createdAt' },
          records: {
            $push: {
              _id: '$_id',
              invoiceNumber: '$invoiceNumber',
              locationName: '$locationName',
              partsCount: { $size: '$parts' },
              imagesCount: { $size: '$images' },
              createdAt: '$createdAt',
            },
          },
        },
      },

      // Lookup employee details
      {
        $lookup: {
          from: 'tvs_users',
          localField: '_id',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: '$employee' },

      // Project clean output
      {
        $project: {
          _id: 0,
          employeeId: '$_id',
          name: '$employee.name',
          email: '$employee.email',
          totalUnloads: 1,
          totalParts: 1,
          locations: 1,
          invoiceCount: { $size: '$invoices' },
          lastActivity: 1,
          records: { $slice: ['$records', 20] }, // Limit to latest 20
        },
      },

      { $sort: { totalUnloads: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: report,
      dateRange: {
        start: dateStart || null,
        end: dateEnd || null,
        filter: filter || 'all',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
