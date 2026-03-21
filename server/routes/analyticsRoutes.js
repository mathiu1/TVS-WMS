const express = require('express');
const ExcelJS = require('exceljs');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const UnloadingRecord = require('../models/UnloadingRecord');
const User = require('../models/User');
const mongoose = require('mongoose');

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
          vehicleNumbers: { $addToSet: '$vehicleNumber' },
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
          vehicleNumbers: 1,
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

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    const [totalRecords, todayRecords, thisWeekRecords, thisMonthRecords, totalEmployees, invoiceStats] = await Promise.all([
      UnloadingRecord.countDocuments(),
      UnloadingRecord.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      UnloadingRecord.countDocuments({
        createdAt: { $gte: weekStart, $lt: tomorrow },
      }),
      UnloadingRecord.countDocuments({
        createdAt: { $gte: monthStart, $lt: tomorrow },
      }),
      UnloadingRecord.distinct('employee'),
      UnloadingRecord.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $sum: '$vendors.invoiceCount' } },
            today: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$createdAt', today] }, { $lt: ['$createdAt', tomorrow] }] },
                  { $sum: '$vendors.invoiceCount' },
                  0
                ]
              }
            },
            week: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$createdAt', weekStart] }, { $lt: ['$createdAt', tomorrow] }] },
                  { $sum: '$vendors.invoiceCount' },
                  0
                ]
              }
            },
            month: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$createdAt', monthStart] }, { $lt: ['$createdAt', tomorrow] }] },
                  { $sum: '$vendors.invoiceCount' },
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const invoices = invoiceStats[0] || { total: 0, today: 0, week: 0, month: 0 };

    res.status(200).json({
      success: true,
      data: {
        totalRecords,
        todayRecords,
        thisWeekRecords,
        thisMonthRecords,
        activeEmployees: totalEmployees.length,
        totalInvoices: invoices.total,
        todayInvoices: invoices.today,
        thisWeekInvoices: invoices.week,
        thisMonthInvoices: invoices.month
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/analytics/dashboard-stats
// @desc    Get data for charts (weekly trends & employee performance)
// @access  Private (manager only)
router.get('/dashboard-stats', auth, authorize('manager'), async (req, res) => {
  try {
    const { startDate: qStart, endDate: qEnd } = req.query;
    const now = new Date();

    let startDate, endDate;

    if (qStart || qEnd) {
      startDate = qStart ? new Date(qStart) : new Date(0); // Default to beginning of time if only end date provided
      endDate = qEnd ? new Date(qEnd) : new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // "All Time" — no initial date constraint for the match stage
      // But we need a start date for the trend-filling loop below
      const earliestRecord = await UnloadingRecord.findOne().sort({ createdAt: 1 });
      if (earliestRecord) {
        startDate = new Date(earliestRecord.createdAt);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      }
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    const matchStage = {};
    if (qStart || qEnd) {
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    // 1. Trends (Total unloads per day)
    const trends = await UnloadingRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Employee Performance (Top performers in this period)
    const performance = await UnloadingRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$employee',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'tvs_users',
          localField: '_id',
          foreignField: '_id',
          as: 'employeeInfo'
        }
      },
      { $unwind: '$employeeInfo' },
      {
        $project: {
          _id: 0,
          name: '$employeeInfo.name',
          count: 1
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 3. Location Distribution
    const locationDist = await UnloadingRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$locationName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. Hourly Distribution (Peak Hours)
    const hourlyDist = await UnloadingRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 5. Shift Performance Analysis
    // Morning: 06:00 - 13:59, Afternoon: 14:00 - 21:59, Night: 22:00 - 05:59
    const shiftAnalysis = await UnloadingRecord.aggregate([
      { $match: matchStage },
      {
        $project: {
          hour: { $hour: '$createdAt' }
        }
      },
      {
        $project: {
          shift: {
            $cond: [
              { $and: [{ $gte: ['$hour', 6] }, { $lt: ['$hour', 14] }] },
              'Morning',
              {
                $cond: [
                  { $and: [{ $gte: ['$hour', 14] }, { $lt: ['$hour', 22] }] },
                  'Afternoon',
                  'Night'
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$shift',
          count: { $sum: 1 }
        }
      }
    ]);

    // 6. Volume Metrics (Total Parts & Invoices)
    const volumeMetrics = await UnloadingRecord.aggregate([
      { $match: matchStage },
      {
        $project: {
          totalParts: { $sum: '$vendors.partsCount' },
          totalInvoices: { $sum: '$vendors.invoiceCount' }
        }
      },
      {
        $group: {
          _id: null,
          totalParts: { $sum: '$totalParts' },
          totalInvoices: { $sum: '$totalInvoices' },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    // 3. Post-process Trends to include every day in the range
    const trendsMap = new Map(trends.map(t => [t._id, t.total]));
    const completeTrends = [];
    let current = new Date(startDate);

    // Create a copy of endDate to compare safely
    const endCompare = new Date(endDate);

    while (current <= endCompare) {
      const dateStr = current.toISOString().split('T')[0];
      completeTrends.push({
        date: dateStr,
        total: trendsMap.get(dateStr) || 0
      });
      current.setDate(current.getDate() + 1);
    }

    // Process locations: Top 15 + Others
    let processedLocations = [];
    if (locationDist.length > 16) {
      const top15 = locationDist.slice(0, 15);
      const others = locationDist.slice(15).reduce((acc, curr) => acc + curr.count, 0);
      processedLocations = top15.map(l => ({ name: l._id || 'Unknown', value: l.count }));
      processedLocations.push({ name: 'Others', value: others });
    } else {
      processedLocations = locationDist.map(l => ({ name: l._id || 'Unknown', value: l.count }));
    }

    res.status(200).json({
      success: true,
      data: {
        weeklyTrends: completeTrends,
        employeePerformance: performance,
        locationDistribution: processedLocations,
        hourlyActivity: hourlyDist.map(h => ({ hour: h._id, count: h.count })),
        shiftPerformance: shiftAnalysis.map(s => ({ name: s._id, value: s.count })),
        totalParts: volumeMetrics[0]?.totalParts || 0,
        totalInvoices: volumeMetrics[0]?.totalInvoices || 0,
        totalRecords: volumeMetrics[0]?.totalRecords || 0
      }
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
      matchStage.employee = new mongoose.Types.ObjectId(employeeId);
    }
    if (dateStart) matchStage.createdAt = { $gte: dateStart };
    if (dateEnd) {
      matchStage.createdAt = matchStage.createdAt || {};
      matchStage.createdAt.$lte = dateEnd;
    }

    const userMatch = {};
    if (employeeId) {
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
            {
              $project: {
                _id: 1,
                vehicleNumber: 1,
                locationName: 1,
                createdAt: 1,
                vendorCount: { $size: '$vendors' },
                invoiceCount: { $sum: '$vendors.invoiceCount' },
                partsCount: { $sum: '$vendors.partsCount' },
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
              in: {
                $add: [
                  '$$value',
                  {
                    $reduce: {
                      input: '$$this.vendors',
                      initialValue: 0,
                      in: { $add: ['$$value', '$$this.partsCount'] }
                    }
                  }
                ]
              },
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

// @route   GET /api/analytics/export-excel
// @desc    Export unloading reports to Excel
// @access  Private (manager only)
router.get('/export-excel', auth, authorize('manager'), async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

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
    if (employeeId && employeeId !== 'all') {
      matchStage.employee = new mongoose.Types.ObjectId(employeeId);
    }

    const records = await UnloadingRecord.find(matchStage)
      .populate('employee', 'name email employeeId')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Detailed Reports');

    // --- AGGREGATE DATA FOR ANALYTICS SHEET ---
    const dailyStats = {};
    const shiftStats = { Morning: 0, Afternoon: 0, Night: 0 };
    const locationStats = {};
    const vendorStats = {};
    const employeeStats = {};

    records.forEach(r => {
      const d = new Date(r.createdAt).toISOString().split('T')[0];
      const hour = new Date(r.createdAt).getHours();

      // Daily
      if (!dailyStats[d]) dailyStats[d] = { unloads: 0, invoices: 0, parts: 0 };
      dailyStats[d].unloads++;

      // Shift
      let shift = 'Night';
      if (hour >= 6 && hour < 14) shift = 'Morning';
      else if (hour >= 14 && hour < 22) shift = 'Afternoon';
      shiftStats[shift]++;

      // Location
      const loc = r.locationName || 'Unknown';
      locationStats[loc] = (locationStats[loc] || 0) + 1;

      // Employee
      const empName = r.employee?.name || 'Unknown';
      employeeStats[empName] = (employeeStats[empName] || 0) + 1;

      r.vendors.forEach(v => {
        dailyStats[d].invoices += (v.invoiceCount || 0);
        dailyStats[d].parts += (v.partsCount || 0);

        const vName = v.vendorName || 'Unknown';
        vendorStats[vName] = (vendorStats[vName] || 0) + (v.invoiceCount || 0);
      });
    });

    const sortedDates = Object.keys(dailyStats).sort();

    // 1. Calculate Statistics
    const totalInvoices = records.reduce((sum, r) => sum + r.vendors.reduce((s, v) => s + (v.invoiceCount || 0), 0), 0);
    const totalParts = records.reduce((sum, r) => sum + r.vendors.reduce((s, v) => s + (v.partsCount || 0), 0), 0);
    const totalRecords = records.length;

    // --- SHEET 1: DETAILED REPORTS (Existing Logic) ---
    // Row 1: Title Banner
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'TVS STORE UNLOADING REPORT';
    titleCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;
    worksheet.mergeCells('A1:J1');

    // Row 2-3: Scorecards
    const styleScoreLabel = (cell, text) => {
      cell.value = text;
      cell.font = { bold: true, size: 9, color: { argb: 'FF64748B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    };
    const styleScoreVal = (cell, val) => {
      cell.value = val;
      cell.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    };

    worksheet.mergeCells('A2:B2');
    styleScoreLabel(worksheet.getCell('A2'), 'TOTAL UNLOADS');
    worksheet.mergeCells('C2:D2');
    styleScoreLabel(worksheet.getCell('C2'), 'TOTAL INVOICES');
    worksheet.mergeCells('E2:F2');
    styleScoreLabel(worksheet.getCell('E2'), 'TOTAL PARTS');

    worksheet.mergeCells('A3:B3');
    styleScoreVal(worksheet.getCell('A3'), totalRecords);
    worksheet.mergeCells('C3:D3');
    styleScoreVal(worksheet.getCell('C3'), totalInvoices);
    worksheet.mergeCells('E3:F3');
    styleScoreVal(worksheet.getCell('E3'), totalParts);

    const now = new Date();
    const metaCell = worksheet.getCell('I2');
    metaCell.value = `GEN DATE: ${now.toLocaleDateString()}\nGEN TIME: ${now.toLocaleTimeString()}`;
    metaCell.font = { size: 8, italic: true, color: { argb: 'FF94A3B8' } };
    metaCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    worksheet.mergeCells('I2:J3');

    const headerRowNumber = 4;
    const columns = [
      { header: 'SL NO', key: 'slNo', width: 8 },
      { header: 'DATE', key: 'date', width: 14 },
      { header: 'TIME', key: 'time', width: 12 },
      { header: 'VEHICLE NUMBER', key: 'vehicleNumber', width: 22 },
      { header: 'EMPLOYEE', key: 'employee', width: 22 },
      { header: 'VENDOR NAME', key: 'vendorName', width: 28 },
      { header: 'UNIQUE ID', key: 'vendorId', width: 14 },
      { header: 'INVOICES', key: 'invoices', width: 10 },
      { header: 'PARTS', key: 'parts', width: 12 },
      { header: 'LOCATION NAME', key: 'storage', width: 25 },
    ];

    worksheet.getRow(headerRowNumber).values = columns.map(c => c.header);
    columns.forEach((col, idx) => {
      const gCol = worksheet.getColumn(idx + 1);
      gCol.key = col.key;
      gCol.width = col.width;
    });

    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.height = 28;
    headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let i = 1; i <= columns.length; i++) {
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    }

    let currentRow = headerRowNumber + 1;
    let slNo = 1;
    let isZebra = false;

    records.forEach((record) => {
      const dObj = new Date(record.createdAt);
      const startR = currentRow;

      if (record.vendors && Array.isArray(record.vendors)) {
        record.vendors.forEach((vendor) => {
          const row = worksheet.addRow({
            slNo,
            date: dObj.toLocaleDateString(),
            time: dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            vehicleNumber: record.vehicleNumber || '—',
            employee: record.employee?.name || 'Unknown',
            vendorName: vendor.vendorName || '—',
            vendorId: vendor.vendorId?.toString() || '—',
            invoices: Number(vendor.invoiceCount || 0),
            parts: Number(vendor.partsCount || 0),
            storage: vendor.storageLocation || '—',
          });
          row.height = 22;
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            if (isZebra && colNumber <= columns.length) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            }
            if (colNumber <= columns.length) {
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
              };
            }
            cell.alignment = [1, 2, 3, 7, 8, 9].includes(colNumber)
              ? { vertical: 'middle', horizontal: 'center' }
              : { vertical: 'middle', horizontal: 'left', indent: 1 };
            cell.font = { name: 'Arial', size: 9 };
          });
          currentRow++;
        });

        if (record.vendors.length > 1) {
          [1, 2, 3, 4, 5].forEach(ci => {
            worksheet.mergeCells(startR, ci, startR + record.vendors.length - 1, ci);
          });
        }
      } else {
        // Fallback for unexpected data structure
        currentRow++;
      }

      slNo++;
      isZebra = !isZebra;
    });

    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft' }];

    // --- SHEET 2: ANALYTICS DASHBOARD ---
    const dashSheet = workbook.addWorksheet('Analytics Dashboard');

    // Style Helpers for Dashboard
    const styleDashHeader = (cell, color = 'FF1E40AF') => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      cell.alignment = { horizontal: 'center' };
    };

    // 1. Daily Trends Table
    dashSheet.mergeCells('B2:E2');
    const trendTitle = dashSheet.getCell('B2');
    trendTitle.value = 'DAILY UNLOADING TRENDS';
    trendTitle.font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };
    trendTitle.alignment = { horizontal: 'center' };

    dashSheet.getRow(3).values = ['', 'Date', 'Unloads', 'Invoices', 'Parts'];
    ['B3', 'C3', 'D3', 'E3'].forEach(c => styleDashHeader(dashSheet.getCell(c)));

    const trendStartRow = 4;
    let dashRow = 4;
    sortedDates.forEach(date => {
      dashSheet.getRow(dashRow).values = ['', date, dailyStats[date].unloads, dailyStats[date].invoices, dailyStats[date].parts];
      dashRow++;
    });

    if (dashRow > trendStartRow) {
      dashSheet.addConditionalFormatting({
        ref: `C${trendStartRow}:C${dashRow - 1}`,
        rules: [{
          type: 'dataBar',
          cfvo: [{ type: 'min', value: 0 }, { type: 'max', value: Math.max(...Object.values(dailyStats).map(s => s.unloads), 1) }],
          color: { argb: 'FF3B82F6' }
        }]
      });
      dashSheet.addConditionalFormatting({
        ref: `D${trendStartRow}:D${dashRow - 1}`,
        rules: [{ type: 'dataBar', cfvo: [{ type: 'min', value: 0 }], color: { argb: 'FF2563EB' } }]
      });
    }

    // 2. Shift Distribution
    const shiftCol = 7;
    dashSheet.mergeCells(2, shiftCol, 2, shiftCol + 1);
    const shiftTitle = dashSheet.getCell(2, shiftCol);
    shiftTitle.value = 'SHIFT ANALYSIS';
    shiftTitle.font = { bold: true, size: 12, color: { argb: 'FF7C3AED' } };
    shiftTitle.alignment = { horizontal: 'center' };

    dashSheet.getRow(3).getCell(shiftCol).value = 'Shift';
    dashSheet.getRow(3).getCell(shiftCol + 1).value = 'Activity';
    styleDashHeader(dashSheet.getRow(3).getCell(shiftCol), 'FF7C3AED');
    styleDashHeader(dashSheet.getRow(3).getCell(shiftCol + 1), 'FF7C3AED');

    const shiftEntries = Object.entries(shiftStats);
    shiftEntries.forEach(([shift, count], idx) => {
      const row = dashSheet.getRow(4 + idx);
      row.getCell(shiftCol).value = shift;
      row.getCell(shiftCol + 1).value = count;
    });

    if (shiftEntries.length > 0) {
      const colLetter = dashSheet.getColumn(shiftCol + 1).letter;
      dashSheet.addConditionalFormatting({
        ref: `${colLetter}4:${colLetter}${4 + shiftEntries.length - 1}`,
        rules: [{ type: 'dataBar', cfvo: [{ type: 'min', value: 0 }], color: { argb: 'FF8B5CF6' } }]
      });
    }

    // 3. Top Locations
    const locCol = 10;
    dashSheet.mergeCells(2, locCol, 2, locCol + 1);
    const locTitle = dashSheet.getCell(2, locCol);
    locTitle.value = 'LOCATION ACTIVITY';
    locTitle.font = { bold: true, size: 12, color: { argb: 'FF059669' } };
    locTitle.alignment = { horizontal: 'center' };

    dashSheet.getRow(3).getCell(locCol).value = 'Location';
    dashSheet.getRow(3).getCell(locCol + 1).value = 'Unloads';
    styleDashHeader(dashSheet.getRow(3).getCell(locCol), 'FF059669');
    styleDashHeader(dashSheet.getRow(3).getCell(locCol + 1), 'FF059669');

    const topLocs = Object.entries(locationStats).sort((a, b) => b[1] - a[1]).slice(0, 10);
    topLocs.forEach(([loc, count], idx) => {
      const row = dashSheet.getRow(4 + idx);
      row.getCell(locCol).value = loc;
      row.getCell(locCol + 1).value = count;
    });

    if (topLocs.length > 0) {
      const colLetter = dashSheet.getColumn(locCol + 1).letter;
      dashSheet.addConditionalFormatting({
        ref: `${colLetter}4:${colLetter}${4 + topLocs.length - 1}`,
        rules: [{ type: 'dataBar', cfvo: [{ type: 'min', value: 0 }], color: { argb: 'FF10B981' } }]
      });
    }

    // 4. Employee Performance
    const empStartRow = dashRow + 2;
    dashSheet.mergeCells(empStartRow, 2, empStartRow, 3);
    const empHeading = dashSheet.getCell(empStartRow, 2);
    empHeading.value = 'EMPLOYEE PERFORMANCE';
    empHeading.font = { bold: true, size: 12, color: { argb: 'FFD97706' } };
    empHeading.alignment = { horizontal: 'center' };

    dashSheet.getRow(empStartRow + 1).getCell(2).value = 'Employee';
    dashSheet.getRow(empStartRow + 1).getCell(3).value = 'Total Unloads';
    styleDashHeader(dashSheet.getRow(empStartRow + 1).getCell(2), 'FFD97706');
    styleDashHeader(dashSheet.getRow(empStartRow + 1).getCell(3), 'FFD97706');

    const topEmps = Object.entries(employeeStats).sort((a, b) => b[1] - a[1]).slice(0, 10);
    topEmps.forEach(([name, count], idx) => {
      dashSheet.getRow(empStartRow + 2 + idx).getCell(2).value = name;
      dashSheet.getRow(empStartRow + 2 + idx).getCell(3).value = count;
    });

    if (topEmps.length > 0) {
      dashSheet.addConditionalFormatting({
        ref: `C${empStartRow + 2}:C${empStartRow + 2 + topEmps.length - 1}`,
        rules: [{ type: 'dataBar', cfvo: [{ type: 'min', value: 0 }], color: { argb: 'FFF59E0B' } }]
      });
    }

    // Auto-fit columns for Dashboard
    dashSheet.columns.forEach(col => { col.width = 15; });
    dashSheet.getColumn(10).width = 25; // Location Name wider

    // --- FINALIZE ---
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=TVS_WMS_Report_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel Export Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Excel report',
    });
  }
});

module.exports = router;
