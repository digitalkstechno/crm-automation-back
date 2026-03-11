const LEAD = require("../model/lead");
const ACCOUNTMASTER = require("../model/accountMaster");
const STAFF = require("../model/staff");
const reportHelper = require("../utils/reportHelper");

/* ==================== DOWNLOAD LEADS REPORT ==================== */
exports.downloadLeadsReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = {
      leadStatus: { $in: req.permissions },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) {
      query.leadStatus = status;
    }

    // Apply view_own filter
    const leads = await LEAD.find(query)
      .populate({
        path: "accountMaster",
        populate: [
          { path: "assignBy" },
          { path: "sourceFrom" }
        ]
      })
      .sort({ createdAt: -1 });

    // Filter by assignment if view_own
    let filteredLeads = leads;
    if (req.user.role.accountMasterViewType === 'view_own') {
      filteredLeads = leads.filter(lead => 
        lead.accountMaster?.assignBy?._id.toString() === req.user._id.toString()
      );
    }

    const workbook = await reportHelper.generateLeadsReport(filteredLeads);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Leads_Report_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message
    });
  }
};

/* ==================== DOWNLOAD LEAD ITEMS REPORT ==================== */
exports.downloadLeadItemsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = {
      leadStatus: { $in: req.permissions },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const leads = await LEAD.find(query)
      .populate("accountMaster")
      .populate("items.inquiryCategory")
      .populate({
        path: "items.modelSuggestion",
        populate: { path: "color" }
      })
      .populate("items.customizationType")
      .sort({ createdAt: -1 });

    let filteredLeads = leads;
    if (req.user.role.accountMasterViewType === 'view_own') {
      filteredLeads = leads.filter(lead => 
        lead.accountMaster?.assignBy?.toString() === req.user._id.toString()
      );
    }

    const workbook = await reportHelper.generateLeadItemsReport(filteredLeads);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Lead_Items_Report_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message
    });
  }
};

/* ==================== DOWNLOAD PAYMENT REPORT ==================== */
exports.downloadPaymentReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = {
      leadStatus: { $in: req.permissions },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const leads = await LEAD.find(query)
      .populate({
        path: "accountMaster",
        populate: { path: "assignBy" }
      })
      .sort({ createdAt: -1 });

    let filteredLeads = leads;
    if (req.user.role.accountMasterViewType === 'view_own') {
      filteredLeads = leads.filter(lead => 
        lead.accountMaster?.assignBy?._id.toString() === req.user._id.toString()
      );
    }

    const workbook = await reportHelper.generatePaymentReport(filteredLeads);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Payment_Report_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message
    });
  }
};

/* ==================== DOWNLOAD FOLLOW UP REPORT ==================== */
exports.downloadFollowUpReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = {
      leadStatus: { $in: req.permissions },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      followUps: { $exists: true, $ne: [] }
    };

    if (startDate && endDate) {
      query["followUps.date"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const leads = await LEAD.find(query)
      .populate({
        path: "accountMaster",
        populate: { path: "assignBy" }
      })
      .sort({ "followUps.date": 1 });

    let filteredLeads = leads;
    if (req.user.role.accountMasterViewType === 'view_own') {
      filteredLeads = leads.filter(lead => 
        lead.accountMaster?.assignBy?._id.toString() === req.user._id.toString()
      );
    }

    const workbook = await reportHelper.generateFollowUpReport(filteredLeads);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Follow_Up_Report_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message
    });
  }
};

/* ==================== DOWNLOAD ACCOUNT MASTER REPORT ==================== */
exports.downloadAccountMasterReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = {
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Apply view_own filter
    if (req.user.role.accountMasterViewType === 'view_own') {
      query.assignBy = req.user._id;
    }

    const accounts = await ACCOUNTMASTER.find(query)
      .populate("sourcebyTypeOfClient")
      .populate("sourceFrom")
      .populate("assignBy")
      .sort({ createdAt: -1 });

    const workbook = await reportHelper.generateAccountMasterReport(accounts);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Account_Master_Report_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message
    });
  }
};

/* ==================== DOWNLOAD STAFF PERFORMANCE REPORT ==================== */
exports.downloadStaffPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const staffList = await STAFF.find({ isDeleted: false })
      .populate("role")
      .select("fullName email role");

    const staffData = [];

    for (const staff of staffList) {
      const totalAccounts = await ACCOUNTMASTER.countDocuments({
        assignBy: staff._id,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        ...dateFilter
      });

      const leads = await LEAD.find({
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        ...dateFilter
      }).populate("accountMaster");

      const staffLeads = leads.filter(lead => 
        lead.accountMaster?.assignBy?.toString() === staff._id.toString()
      );

      const totalLeads = staffLeads.length;
      const convertedLeads = staffLeads.filter(lead => 
        lead.leadStatus === "Completed"
      ).length;

      const totalRevenue = staffLeads.reduce((sum, lead) => 
        sum + parseFloat(lead.totalAmount || 0), 0
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pendingFollowUps = staffLeads.filter(lead => 
        lead.followUps?.some(f => new Date(f.date) >= today)
      ).length;

      staffData.push({
        fullName: staff.fullName,
        email: staff.email,
        role: staff.role?.roleName || 'N/A',
        totalAccounts,
        totalLeads,
        convertedLeads,
        totalRevenue: totalRevenue.toFixed(2),
        pendingFollowUps
      });
    }

    const workbook = await reportHelper.generateStaffPerformanceReport(staffData);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Staff_Performance_Report_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message
    });
  }
};

/* ==================== DOWNLOAD SUMMARY REPORT ==================== */
exports.downloadSummaryReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const totalAccounts = await ACCOUNTMASTER.countDocuments({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    });

    const leads = await LEAD.find({
      leadStatus: { $in: req.permissions },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      ...dateFilter
    }).populate("accountMaster");

    let filteredLeads = leads;
    if (req.user.role.accountMasterViewType === 'view_own') {
      filteredLeads = leads.filter(lead => 
        lead.accountMaster?.assignBy?.toString() === req.user._id.toString()
      );
    }

    const totalLeads = filteredLeads.length;
    const convertedAccountIds = [...new Set(filteredLeads.map(l => l.accountMaster?._id?.toString()).filter(Boolean))];
    const convertedAccounts = convertedAccountIds.length;
    const notConvertedAccounts = totalAccounts - convertedAccounts;

    let totalRevenue = 0;
    let totalPaid = 0;
    filteredLeads.forEach(lead => {
      totalRevenue += parseFloat(lead.totalAmount || 0);
      totalPaid += (lead.paymentHistory || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    });
    const totalPending = totalRevenue - totalPaid;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayFollowUps = filteredLeads.filter(lead => 
      lead.followUps?.some(f => {
        const fDate = new Date(f.date);
        return fDate >= today && fDate < tomorrow;
      })
    ).length;

    const statusCounts = {};
    for (const status of req.permissions) {
      const count = filteredLeads.filter(l => l.leadStatus === status).length;
      if (count > 0) {
        statusCounts[status] = count;
      }
    }

    const summaryData = {
      totalAccounts,
      totalLeads,
      convertedAccounts,
      notConvertedAccounts,
      totalRevenue: totalRevenue.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalPending: totalPending.toFixed(2),
      todayFollowUps,
      statusCounts
    };

    const workbook = await reportHelper.generateSummaryReport(summaryData);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Summary_Report_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message
    });
  }
};
