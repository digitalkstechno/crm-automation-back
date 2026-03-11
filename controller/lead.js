const LEAD = require("../model/lead");
const { validatePositiveNumber, validateRequiredField } = require("../utils/validation");

/* =========================
   CREATE LEAD
========================= */

exports.createLead = async (req, res) => {
  try {
    const {
      leadDate,
      clientType,
      deliveryDate,
      shippingCharges,
      budget,
      accountMaster,
      leadStatus,
      items,
      remarks,
      paymentHistory,
      totalAmount,
    } = req.body;

    // Validation
    if (!validateRequiredField(leadDate)) {
      throw new Error("Lead date is required");
    }
    /* if (!validateRequiredField(clientType)) {
      throw new Error("Client type is required");
    } */
    if (!validateRequiredField(accountMaster)) {
      throw new Error("Account master is required");
    }
    if (!items || items.length === 0) {
      throw new Error("At least one item is required");
    }
    if (shippingCharges && shippingCharges !== 0 && !validatePositiveNumber(shippingCharges)) {
      throw new Error("Shipping charges must be a positive number");
    }
    if (budget && budget.from && !validatePositiveNumber(budget.from)) {
      throw new Error("Budget from must be a positive number");
    }
    if (budget && budget.to && !validatePositiveNumber(budget.to)) {
      throw new Error("Budget to must be a positive number");
    }
    if (budget && budget.from && budget.to && parseFloat(budget.from) > parseFloat(budget.to)) {
      throw new Error("Budget from cannot be greater than budget to");
    }

    // Validate items
    items.forEach((item, index) => {
      if (!validateRequiredField(item.inquiryCategory)) {
        throw new Error(`Item ${index + 1}: Inquiry category is required`);
      }
      /* if (!validateRequiredField(item.modelSuggestion)) {
        throw new Error(`Item ${index + 1}: Model suggestion is required`);
      } */
      if (item.qty && (!validatePositiveNumber(item.qty) || parseFloat(item.qty) < 0)) {
        throw new Error(`Item ${index + 1}: Quantity must be a positive number`);
      }
      /* if (item.rate && (!validatePositiveNumber(item.rate) || parseFloat(item.rate) < 0)) {
        throw new Error(`Item ${index + 1}: Rate must be a positive number`);
      } */
      if (!validatePositiveNumber(item.gst) || parseFloat(item.gst) < 0 || parseFloat(item.gst) > 100) {
        throw new Error(`Item ${index + 1}: GST must be between 0 and 100`);
      }
    });

    const leadData = {
      leadDate,
      clientType: clientType || undefined,
      deliveryDate: deliveryDate || undefined,
      shippingCharges: shippingCharges || undefined,
      budget: {
        from: budget?.from || undefined,
        to: budget?.to || undefined,
      },
      accountMaster,
      leadStatus,
      items: items.map(item => ({
        ...item,
        modelSuggestion: item.modelSuggestion || undefined,
        qty: item.qty || "0",
        rate: item.rate || "0",
        gst: item.gst || "0",
        total: item.total || "0"
      })),
      remarks,
      paymentHistory,
      totalAmount,
    };

    const lead = await LEAD.create(leadData);

    return res.status(201).json({
      status: "Success",
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   FETCH ALL LEADS (Pagination + Search)
========================= */

exports.fetchAllLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    let query = {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        { leadStatus: { $in: req.permissions } },
      ],
    };

    if (search) {
      const accountMasters = await require("../model/accountMaster").find({
        $or: [
          { companyName: { $regex: search, $options: "i" } },
          { clientName: { $regex: search, $options: "i" } }
        ]
      }).select('_id');

      const accountMasterIds = accountMasters.map(am => am._id);

      query.$and.push({
        $or: [
          { leadStatus: { $regex: search, $options: "i" } },
          { clientType: { $regex: search, $options: "i" } },
          { accountMaster: { $in: accountMasterIds } }
        ],
      });
    }

    const totalRecords = await LEAD.countDocuments(query);

    const leads = await LEAD.find(query)
      .populate({
        path: "accountMaster",
        populate: [
          { path: "assignBy" },
          { path: "sourcebyTypeOfClient" },
          { path: "sourceFrom" }
        ]
      })
      .populate("items.inquiryCategory")
      .populate({ path: "items.modelSuggestion", populate: { path: "color" } })
      .populate("items.customizationType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      status: "Success",
      message: "Leads fetched successfully",
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        limit,
      },
      data: leads,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   FETCH LEAD BY ID
========================= */

exports.fetchLeadById = async (req, res) => {
  try {
    const id = req.params.id;

    const lead = await LEAD.findById(id)
      .populate({
        path: "accountMaster",
        populate: [
          { path: "assignBy" },
          { path: "sourcebyTypeOfClient" },
          { path: "sourceFrom" }
        ]
      })
      .populate("items.inquiryCategory")
      .populate({ path: "items.modelSuggestion", populate: { path: "color" } })
      .populate("items.customizationType");

    if (!lead) throw new Error("Lead not found");

    return res.status(200).json({
      status: "Success",
      message: "Lead fetched successfully",
      data: lead,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   UPDATE LEAD
========================= */

exports.updateLead = async (req, res) => {
  try {
    const id = req.params.id;

    const oldLead = await LEAD.findById(id);
    if (!oldLead) throw new Error("Lead not found");

    const { LEAD_STATUSES } = require("../constants/leadStatus");
    const newStatus = req.body.leadStatus;

    if (newStatus) {
      const currentIndex = LEAD_STATUSES.indexOf(oldLead.leadStatus);
      const newIndex = LEAD_STATUSES.indexOf(newStatus);

      // Allow only 1 step backward, except for Lost
      if (newIndex < currentIndex - 1 && newStatus !== "Lost") {
        return res.status(400).json({
          status: "Fail",
          message: "Can only move 1 step backward",
        });
      }

      // Update maxStatusReached if moving forward
      const maxIndex = LEAD_STATUSES.indexOf(oldLead.maxStatusReached || "New Lead");
      if (newIndex > maxIndex) {
        req.body.maxStatusReached = newStatus;
      }
    }

    const updateData = { ...req.body };
    if (updateData.clientType === "") updateData.clientType = undefined;
    if (updateData.deliveryDate === "") updateData.deliveryDate = undefined;
    if (updateData.items) {
      updateData.items = updateData.items.map(item => ({
        ...item,
        modelSuggestion: item.modelSuggestion || undefined
      }));
    }

    const updatedLead = await LEAD.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      status: "Success",
      message: "Lead updated successfully",
      data: updatedLead,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   DELETE LEAD
========================= */

exports.deleteLead = async (req, res) => {
  try {
    const id = req.params.id;

    const lead = await LEAD.findById(id);
    if (!lead) throw new Error("Lead not found");

    await LEAD.findByIdAndUpdate(id, { isDeleted: true });

    return res.status(200).json({
      status: "Success",
      message: "Lead deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   FETCH LEADS BY STATUS
========================= */

exports.fetchLeadsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!req.permissions.includes(status)) {
      return res.status(403).json({
        status: "Fail",
        message: "You don't have permission to view this status",
      });
    }

    const query = {
      leadStatus: status,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    };

    const totalRecords = await LEAD.countDocuments(query);

    const leads = await LEAD.find(query)
      .populate({
        path: "accountMaster",
        populate: [
          { path: "assignBy" },
          { path: "sourcebyTypeOfClient" },
          { path: "sourceFrom" }
        ]
      })
      .populate("items.inquiryCategory")
      .populate({ path: "items.modelSuggestion", populate: { path: "color" } })
      .populate("items.customizationType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      status: "Success",
      message: "Leads fetched successfully",
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        limit,
      },
      data: leads,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   ADD FOLLOW UP
========================= */

exports.addFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, description } = req.body;

    if (!date || !description) {
      throw new Error("Date and description are required");
    }

    const lead = await LEAD.findById(id);
    if (!lead) throw new Error("Lead not found");

    lead.followUps.push({ date, description });
    await lead.save();

    return res.status(200).json({
      status: "Success",
      message: "Follow up added successfully",
      data: lead,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   TOGGLE ITEM DONE STATUS
========================= */

exports.toggleItemDone = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    const lead = await LEAD.findById(id);
    if (!lead) throw new Error("Lead not found");

    const item = lead.items.id(itemId);
    if (!item) throw new Error("Item not found");

    item.isDone = !item.isDone;
    await lead.save();

    return res.status(200).json({
      status: "Success",
      message: "Item status updated",
      data: lead,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   ADD PAYMENT
========================= */

exports.addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!validatePositiveNumber(amount) || parseFloat(amount) <= 0) {
      throw new Error("Valid amount is required");
    }

    const lead = await LEAD.findById(id);
    if (!lead) throw new Error("Lead not found");

    const totalAmount = parseFloat(lead.totalAmount || 0);
    const paidAmount = lead.paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const pendingAmount = totalAmount - paidAmount;

    if (parseFloat(amount) > pendingAmount + 0.01) {
      throw new Error("Amount exceeds pending amount");
    }

    lead.paymentHistory.push({ amount, date: new Date() });
    await lead.save();

    return res.status(200).json({
      status: "Success",
      message: "Payment added successfully",
      data: lead,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   DASHBOARD STATS
========================= */

exports.getDashboardStats = async (req, res) => {
  try {
    const { LEAD_STATUSES } = require("../constants/leadStatus");
    const { startDate, endDate, topLimit } = req.query;
    const limit = parseInt(topLimit) || 5;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const statusCounts = {};
    for (const status of req.permissions) {
      const count = await LEAD.countDocuments({
        leadStatus: status,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        ...dateFilter
      });
      statusCounts[status] = count;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayFollowUps = await LEAD.find({
      leadStatus: "Follow Up",
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      "followUps.date": {
        $gte: today,
        $lt: tomorrow
      }
    })
      .populate({
        path: "accountMaster",
        populate: [
          { path: "assignBy" },
          { path: "sourcebyTypeOfClient" }
        ]
      })
      .select("accountMaster leadStatus followUps")
      .sort({ "followUps.date": 1 });

    const followUpsWithDetails = todayFollowUps.map(lead => {
      const todayFollowUp = lead.followUps.find(f => {
        const fDate = new Date(f.date);
        return fDate >= today && fDate < tomorrow;
      });
      return {
        leadId: lead._id,
        companyName: lead.accountMaster?.companyName,
        clientName: lead.accountMaster?.clientName,
        leadStatus: lead.leadStatus,
        followUpDate: todayFollowUp?.date,
        followUpDescription: todayFollowUp?.description
      };
    });

    const allLeads = await LEAD.find({
      leadStatus: { $in: req.permissions },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      ...dateFilter
    })
      .select("totalAmount paymentHistory accountMaster leadStatus items")
      .populate("accountMaster")
      .populate({
        path: "items.modelSuggestion",
        populate: { path: "color" }
      })
      .populate("items.inquiryCategory")
      .populate("items.customizationType");

    // Separate leads for pending calculation (only Dispatch, Completed, Final Payment)
    const pendingStatusLeads = allLeads.filter(lead =>
      lead.leadStatus === "Dispatch" ||
      lead.leadStatus === "Completed" ||
      lead.leadStatus === "Final Payment"
    );

    // Separate leads for top models and category (only Completed)
    const completedLeads = allLeads.filter(lead => lead.leadStatus === "Completed");

    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    const pendingPaymentLeads = [];
    const modelCounts = {};

    // Calculate total paid from all leads
    allLeads.forEach(lead => {
      const paid = (lead.paymentHistory || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      totalPaid += paid;
    });

    // Calculate pending only from Dispatch, Completed, Final Payment status
    pendingStatusLeads.forEach(lead => {
      const total = parseFloat(lead.totalAmount || 0);
      const paid = (lead.paymentHistory || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const pending = total - paid;
      totalPending += pending;

      if (pending > 1) {
        pendingPaymentLeads.push({
          leadId: lead._id,
          companyName: lead.accountMaster?.companyName,
          clientName: lead.accountMaster?.clientName,
          leadStatus: lead.leadStatus,
          totalAmount: total.toFixed(2),
          paidAmount: paid.toFixed(2),
          pendingAmount: pending.toFixed(2)
        });
      }
    });

    // Total Revenue = Total Paid + Total Pending
    totalRevenue = totalPaid + totalPending;

    // Count models only from Completed status
    completedLeads.forEach(lead => {
      lead.items.forEach(item => {
        if (item.modelSuggestion) {
          const modelName = item.modelSuggestion.name || '';
          const modelNo = item.modelSuggestion.modelNo || '';
          const colorName = item.modelSuggestion.color?.name || '';
          const inquiryCat = item.inquiryCategory?.name || '';
          const customType = item.customizationType?.name || '';
          const modelKey = `${item.modelSuggestion._id}|${modelNo}|${modelName}|${colorName}|${inquiryCat}|${customType}`;
          const qty = parseInt(item.qty || 0);
          if (modelCounts[modelKey]) {
            modelCounts[modelKey] += qty;
          } else {
            modelCounts[modelKey] = qty;
          }
        }
      });
    });

    const topModels = Object.entries(modelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => {
        const [id, modelNo, name, color, inquiryCategory, category] = key.split('|');
        return {
          modelNo: modelNo || null,
          name: name || null,
          color: color || null,
          inquiryCategory: inquiryCategory || null,
          category: category || null,
          count
        };
      });

    // Category-wise average rate calculation (only Completed status)
    const categoryData = {};

    completedLeads.forEach(lead => {
      lead.items.forEach(item => {
        if (item.inquiryCategory) {
          const categoryName = item.inquiryCategory.name || 'Unknown';
          const qty = parseInt(item.qty || 0);
          const rate = parseFloat(item.rate || 0);
          const totalPrice = qty * rate;
          if (categoryData[categoryName]) {
            categoryData[categoryName].totalPrice += totalPrice;
            categoryData[categoryName].totalUnits += qty;
          } else {
            categoryData[categoryName] = { totalPrice, totalUnits: qty };
          }
        }
      });
    });

    const categoryPercentages = Object.entries(categoryData)
      .map(([category, data]) => {
        const avgRate = data.totalUnits > 0 ? data.totalPrice / data.totalUnits : 0;
        return {
          category,
          count: data.totalUnits,
          avgRate: parseFloat(avgRate.toFixed(2)),
          percentage: 0
        };
      })
      .sort((a, b) => b.avgRate - a.avgRate);

    const ACCOUNTMASTER = require("../model/accountMaster");
    const totalAccounts = await ACCOUNTMASTER.countDocuments({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    });

    const convertedAccountIds = [...new Set(allLeads.map(lead => lead.accountMaster?._id?.toString()).filter(Boolean))];
    const convertedCount = convertedAccountIds.length;
    const notConvertedCount = totalAccounts - convertedCount;

    // Upcoming Deliveries (Next 7 Days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    next7Days.setHours(23, 59, 59, 999);

    const upcomingDeliveries = await LEAD.find({
      leadStatus: { $in: req.permissions },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      deliveryDate: {
        $gte: today,
        $lte: next7Days
      }
    })
      .populate("accountMaster")
      .select("accountMaster deliveryDate leadStatus totalAmount")
      .sort({ deliveryDate: 1 })
      .limit(20);

    const upcomingDeliveriesData = upcomingDeliveries.map(lead => ({
      leadId: lead._id,
      companyName: lead.accountMaster?.companyName,
      clientName: lead.accountMaster?.clientName,
      deliveryDate: lead.deliveryDate,
      leadStatus: lead.leadStatus,
      totalAmount: parseFloat(lead.totalAmount || 0).toFixed(2)
    }));

    return res.status(200).json({
      status: "Success",
      message: "Dashboard stats fetched successfully",
      data: {
        statusCounts,
        todayFollowUps: followUpsWithDetails,
        paymentStats: {
          totalRevenue: totalRevenue.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
          totalPending: totalPending.toFixed(2)
        },
        pendingPaymentLeads,
        topModels,
        categoryPercentages,
        upcomingDeliveries: upcomingDeliveriesData,
        accountStats: {
          totalAccounts,
          convertedToLead: convertedCount,
          notConvertedToLead: notConvertedCount
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* =========================
   GRAPH DATA
========================= */

exports.getGraphData = async (req, res) => {
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

    const allLeads = await LEAD.find({
      leadStatus: { $in: req.permissions },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      ...dateFilter
    }).select("totalAmount paymentHistory leadStatus accountMaster createdAt");

    // Separate leads for pending calculation (only Dispatch, Completed, Final Payment)
    const pendingStatusLeads = allLeads.filter(lead =>
      lead.leadStatus === "Dispatch" ||
      lead.leadStatus === "Completed" ||
      lead.leadStatus === "Final Payment"
    );

    // Payment Stats Graph Data
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;

    // Calculate total paid from all leads
    allLeads.forEach(lead => {
      const paid = (lead.paymentHistory || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      totalPaid += paid;
    });

    // Calculate pending only from Dispatch, Completed, Final Payment status
    pendingStatusLeads.forEach(lead => {
      const total = parseFloat(lead.totalAmount || 0);
      const paid = (lead.paymentHistory || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const pending = total - paid;
      totalPending += pending;
    });

    // Total Revenue = Total Paid + Total Pending
    totalRevenue = totalPaid + totalPending;

    const paymentGraphData = [
      { label: "Total Revenue", value: parseFloat(totalRevenue.toFixed(2)), color: "#10b981" },
      { label: "Total Paid", value: parseFloat(totalPaid.toFixed(2)), color: "#3b82f6" },
      { label: "Total Pending", value: parseFloat(totalPending.toFixed(2)), color: "#ef4444" }
    ];

    // Lead Status Graph Data
    const statusCounts = {};
    for (const status of req.permissions) {
      const count = await LEAD.countDocuments({
        leadStatus: status,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        ...dateFilter
      });
      if (count > 0) {
        statusCounts[status] = count;
      }
    }

    const statusGraphData = Object.entries(statusCounts).map(([status, count]) => ({
      label: status,
      value: count
    }));

    // Account Conversion Graph Data
    const ACCOUNTMASTER = require("../model/accountMaster");
    const totalAccounts = await ACCOUNTMASTER.countDocuments({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    });

    const convertedAccountIds = [...new Set(allLeads.map(lead => lead.accountMaster?.toString()).filter(Boolean))];
    const convertedCount = convertedAccountIds.length;
    const notConvertedCount = totalAccounts - convertedCount;

    const accountConversionGraphData = [
      { label: "Converted to Lead", value: convertedCount, color: "#10b981" },
      { label: "Not Converted", value: notConvertedCount, color: "#eab308" }
    ];

    return res.status(200).json({
      status: "Success",
      message: "Graph data fetched successfully",
      data: {
        paymentGraph: paymentGraphData,
        leadStatusGraph: statusGraphData,
        accountConversionGraph: accountConversionGraphData
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};
