const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const UnloadingRecord = require('../models/UnloadingRecord');
const User = require('../models/User');

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
    const { filter, startDate, endDate, employeeId } = req.query;

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
    if (employeeId) {
      const mongoose = require('mongoose');
      matchStage.employee = new mongoose.Types.ObjectId(employeeId);
    }
    if (dateStart) matchStage.createdAt = { $gte: dateStart };
    if (dateEnd) {
      matchStage.createdAt = matchStage.createdAt || {};
      matchStage.createdAt.$lte = dateEnd;
    }

    const userMatch = {};
    if (employeeId) {
      const mongoose = require('mongoose');
      userMatch._id = new mongoose.Types.ObjectId(employeeId);
    }

    const report = await User.aggregate([
      { $match: userMatch },

      // Lookup unloading records with date filtering
      {
        $lookup: {
          from: 'unloadingrecords',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$employee', '$$userId'] },
                    ...(dateStart ? [{ $gte: ['$createdAt', dateStart] }] : []),
                    ...(dateEnd ? [{ $lte: ['$createdAt', dateEnd] }] : []),
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
          ],
          as: 'activityRecords',
        },
      },

      // Project results
      {
        $project: {
          _id: 0,
          employeeId: '$_id',
          name: 1,
          email: 1,
          role: 1,
          totalUnloads: { $size: '$activityRecords' },
          totalParts: {
            $reduce: {
              input: '$activityRecords',
              initialValue: 0,
              in: { $add: ['$$value', { $size: '$$this.parts' }] },
            },
          },
          lastActivity: { $max: '$activityRecords.createdAt' },
          records: { $slice: ['$activityRecords', 20] },
        },
      },

      { $sort: { role: 1, name: 1 } },
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
