const LEAD = require("../model/lead");
const { deleteUploadedFile } = require("../utils/fileHelper");
const { incrementCount, decrementCount } = require("../utils/leadCountHelper");
const LeadStatus = require("../model/leadStatus");
exports.createLead = async (req, res) => {
  try {
    const leadData = { ...req.body };

    // Handle leadLabel[] from FormData
    if (req.body["leadLabel[]"]) {
      leadData.leadLabel = Array.isArray(req.body["leadLabel[]"]) ? req.body["leadLabel[]"] : [req.body["leadLabel[]"]];
      delete leadData["leadLabel[]"];
    }

    if (req.files && req.files.length > 0) {
      leadData.attachments = req.files.map((el) => ({
        originalName: el.originalname,
        filename: el.filename,
        path: `/images/LeadAttachment/${el.filename}`,
      }));
    }

    const leadDetails = await LEAD.create(leadData);

    await incrementCount({
      statusId: leadDetails.leadStatus,
      sourceId: leadDetails.leadSource,
    });

    return res.status(201).json({
      status: "Success",
      message: "Leads created successfully",
      data: leadDetails,
    });
  } catch (error) {
    if (req.files) {
      req.files.map((el) =>
        deleteUploadedFile("images/LeadAttachment", el.filename),
      );
    }
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search = "", status, source, staff, date, from, to } = req.query;

    // 🔥 BASE QUERY
    const query = {};

    /* =====================
       SEARCH (TEXT)
    ====================== */
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { priority: { $regex: search, $options: "i" } },
      ];
    }

    /* =====================
       STATUS FILTER
    ====================== */
    if (status) {
      query.leadStatus = status; // expects ObjectId
    }

    /* =====================
       SOURCE FILTER
    ====================== */
    if (source) {
      query.leadSource = source; // expects ObjectId
    }

    /* =====================
       STAFF FILTER
    ====================== */
    if (staff) {
      query.assignedTo = staff; // expects ObjectId
    }

    if (from || to) {
      const start = from ? new Date(from) : new Date(0);
      start.setHours(0, 0, 0, 0);

      const end = to ? new Date(to) : new Date();
      end.setHours(23, 59, 59, 999);

      query.createdAt = { $gte: start, $lte: end };
    } else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      query.createdAt = { $gte: start, $lte: end };
    }

    if (req.leadScope === "own" && req.user && req.user._id) {
      query.assignedTo = req.user._id;
    }

    /* =====================
       DB QUERY
    ====================== */
    const totalLeads = await LEAD.countDocuments(query);

    const LeadData = await LEAD.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("leadStatus")
      .populate("leadSource")
      .populate("leadLabel")
      .populate("assignedTo");

    return res.status(200).json({
      status: "Success",
      message: "Leads fetched successfully",
      pagination: {
        totalRecords: totalLeads,
        currentPage: page,
        totalPages: Math.ceil(totalLeads / limit),
        limit,
      },
      data: LeadData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchMyLeads = async (req, res) => {
  req.leadScope = "own";
  return exports.fetchAllLeads(req, res);
};

exports.fetchLeadById = async (req, res) => {
  try {
    let LeadId = req.params.id;
    let leadData = await LEAD.findById(LeadId)
      .populate({ path: "leadStatus" })
      .populate({ path: "leadSource" })
      .populate({ path: "assignedTo" });
    if (!leadData) {
      throw new Error("Lead not found");
    }

    if (
      req.leadScope === "own" &&
      req.user &&
      leadData.assignedTo &&
      leadData.assignedTo._id &&
      String(leadData.assignedTo._id) !== String(req.user._id)
    ) {
      return res.status(403).json({
        status: "Fail",
        message: "Access denied",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "Lead fetched successfully",
      data: leadData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.leadUpdate = async (req, res) => {
  try {
    let leadId = req.params.id;
    let oldLeads = await LEAD.findById(leadId);

    if (!oldLeads) {
      throw new Error("Lead not found");
    }

    const updateData = { ...req.body };

    // Handle leadLabel[] from FormData
    if (req.body["leadLabel[]"]) {
      updateData.leadLabel = Array.isArray(req.body["leadLabel[]"]) ? req.body["leadLabel[]"] : [req.body["leadLabel[]"]];
      delete updateData["leadLabel[]"];
    }

    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map((el) => ({
        originalName: el.originalname,
        filename: el.filename,
        path: `/images/LeadAttachment/${el.filename}`,
      }));
      updateData.attachments = [...(oldLeads.attachments || []), ...newAttachments];
    }

    let updatedLeads = await LEAD.findByIdAndUpdate(leadId, updateData, {
      new: true,
    })
      .populate("leadStatus")
      .populate("leadSource")
      .populate("assignedTo")
      .populate("leadLabel");

    // 🔹 Status change handling
    if (
      oldLeads.leadStatus?.toString() !== updatedLeads.leadStatus?.toString()
    ) {
      await decrementCount({ statusId: oldLeads.leadStatus });
      await incrementCount({ statusId: updatedLeads.leadStatus });
    }

    // 🔹 Source change handling
    if (
      oldLeads.leadSource?.toString() !== updatedLeads.leadSource?.toString()
    ) {
      await decrementCount({ sourceId: oldLeads.leadSource });
      await incrementCount({ sourceId: updatedLeads.leadSource });
    }
    return res.status(200).json({
      status: "Success",
      message: "Lead updated successfully",
      data: updatedLeads,
    });
  } catch (error) {
    if (req.files) {
      req.files.map((el) =>
        deleteUploadedFile("images/LeadAttachment", el.filename),
      );
    }
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.leadDelete = async (req, res) => {
  try {
    let leadId = req.params.id;
    let oldLead = await LEAD.findById(leadId);

    if (!oldLead) {
      throw new Error("Lead not found");
    }
    if (oldLead.attachments && oldLead.attachments.length > 0) {
      oldLead.attachments.map((el) => {
        const fileName = (typeof el === 'object' && el.filename) ? el.filename : el;
        deleteUploadedFile("images/LeadAttachment", fileName);
      });
    }

    await decrementCount({
      statusId: oldLead.leadStatus,
      sourceId: oldLead.leadSource,
    });

    await LEAD.findByIdAndDelete(leadId);

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

exports.fetchLeadsForKanban = async (req, res) => {
  console.log("leads");
  try {
    const match = {};
    if (req.leadScope === "own" && req.user && req.user._id) {
      match.assignedTo = req.user._id;
    }

    const allStatuses = await LeadStatus.find();

    const kanbanData = await Promise.all(
      allStatuses.map(async (status) => {
        const leadMatch = { ...match, leadStatus: status._id };
        const leads = await LEAD.find(leadMatch)
          .populate("leadStatus")
          .populate("leadSource")
          .populate("leadLabel")
          .populate("assignedTo")
          .sort({ createdAt: -1 })
          .limit(10);

        return {
          statusId: status._id.toString(),
          statusName: status.name,
          leads: leads || [],
        };
      })
    );

    return res.status(200).json({
      status: "Success",
      message: "Kanban leads fetched successfully",
      data: kanbanData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.updateKanbanStatus = async (req, res) => {
  try {
    const leadId = req.params.id;
    const { leadStatus } = req.body;

    const oldLead = await LEAD.findById(leadId);
    if (!oldLead) {
      throw new Error("Lead not found");
    }

    // Update status
    oldLead.leadStatus = leadStatus;
    await oldLead.save();

    // Update count
    if (oldLead.leadStatus.toString() !== leadStatus.toString()) {
      await decrementCount({ statusId: oldLead.leadStatus });
      await incrementCount({ statusId: leadStatus });
    }

    return res.status(200).json({
      status: "Success",
      message: "Lead status updated",
      data: oldLead,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getKanbanCounts = async (req, res) => {
  try {
    const match = {};
    if (req.leadScope === "own" && req.user && req.user._id) {
      match.assignedTo = req.user._id;
    }

    const pipeline = [];
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }
    pipeline.push({
      $group: {
        _id: "$leadStatus",
        total: { $sum: 1 },
      },
    });

    const counts = await LEAD.aggregate(pipeline);

    return res.status(200).json({
      status: "Success",
      data: counts,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getLeadCountSummary = async (req, res) => {
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const endOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const allStatuses = await LeadStatus.find().select("_id name");

    const baseMatch = {};
    if (req.leadScope === "own" && req.user && req.user._id) {
      baseMatch.assignedTo = req.user._id;
    }

    const counts = await LEAD.aggregate([
      {
        $facet: {
          totalLeads: [
            Object.keys(baseMatch).length > 0 ? { $match: baseMatch } : null,
            { $count: "count" },
          ].filter(Boolean),

          monthlyLeads: [
            {
              $match: {
                ...baseMatch,
                createdAt: {
                  $gte: startOfMonth,
                  $lte: endOfMonth,
                },
              },
            },
            { $count: "count" },
          ],

          statusWise: [
            Object.keys(baseMatch).length > 0 ? { $match: baseMatch } : null,
            {
              $group: {
                _id: "$leadStatus",
                count: { $sum: 1 },
              },
            },
          ].filter(Boolean),
        },
      },
    ]);

    const totalLeads = counts[0]?.totalLeads[0]?.count || 0;
    const monthlyLeads = counts[0]?.monthlyLeads[0]?.count || 0;
    const statusWiseRaw = counts[0]?.statusWise || [];

    const statusWiseCounts = allStatuses.map((status) => {
      const found = statusWiseRaw.find(
        (el) => el._id?.toString() === status._id.toString(),
      );

      return {
        statusId: status._id,
        statusName: status.name,
        count: found ? found.count : 0,
      };
    });

    return res.status(200).json({
      status: "Success",
      data: {
        totalLeads,
        currentMonthLeads: monthlyLeads,
        statusWiseCounts,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getMyLeadSummary = async (req, res) => {
  req.leadScope = "own";
  return exports.getLeadCountSummary(req, res);
};

exports.getMyUpcomingFollowups = async (req, res) => {
  req.leadScope = "own";
  return exports.getUpcomingFollowups(req, res);
};

exports.getMyDueFollowups = async (req, res) => {
  req.leadScope = "own";
  return exports.getDueFollowups(req, res);
};

exports.getUpcomingFollowups = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();

    const matchStage = {
      isActive: true,
      nextFollowupDate: { $ne: null },
    };

    if (req.leadScope === "own" && req.user && req.user._id) {
      matchStage.assignedTo = req.user._id;
    }

    const basePipeline = [
      {
        $match: matchStage,
      },
      {
        $addFields: {
          followupDateTime: {
            $dateFromString: {
              dateString: {
                $concat: [
                  {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$nextFollowupDate",
                    },
                  },
                  " ",
                  {
                    $cond: {
                      if: { $in: ["$nextFollowupTime", [null, ""]] },
                      then: "00:00",
                      else: "$nextFollowupTime"
                    }
                  }
                ],
              },
              format: "%Y-%m-%d %H:%M",
              timezone: "Asia/Kolkata", // 🔥 CRITICAL FIX
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $match: { followupDateTime: { $ne: null } }
      },
      {
        $match: {
          followupDateTime: { $gte: now },
        },
      },
    ];

    // 👉 total count
    const totalResult = await LEAD.aggregate([
      ...basePipeline,
      { $count: "count" },
    ]);

    const total = totalResult[0]?.count || 0;

    // 👉 paginated data
    const leads = await LEAD.aggregate([
      ...basePipeline,
      { $sort: { followupDateTime: 1 } }, // nearest first
      { $skip: skip },
      { $limit: limit },

      // populate leadStatus
      {
        $lookup: {
          from: "leadstatuses",
          localField: "leadStatus",
          foreignField: "_id",
          as: "leadStatus",
        },
      },
      { $unwind: { path: "$leadStatus", preserveNullAndEmptyArrays: true } },

      // populate assignedTo
      {
        $lookup: {
          from: "staffs",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedTo",
        },
      },
      { $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true } },

      // populate leadSource
      {
        $lookup: {
          from: "leadsources",
          localField: "leadSource",
          foreignField: "_id",
          as: "leadSource",
        },
      },
      { $unwind: { path: "$leadSource", preserveNullAndEmptyArrays: true } },
    ]);

    return res.status(200).json({
      status: "Success",
      message: "Upcoming followups fetched",
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
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

exports.getDueFollowups = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();

    const matchStage = {
      isActive: true,
      nextFollowupDate: { $ne: null },
      nextFollowupTime: { $ne: null },
    };

    if (req.leadScope === "own" && req.user && req.user._id) {
      matchStage.assignedTo = req.user._id;
    }

    const basePipeline = [
      {
        $match: matchStage,
      },
      {
        $addFields: {
          followupDateTime: {
            $dateFromString: {
              dateString: {
                $concat: [
                  {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$nextFollowupDate",
                    },
                  },
                  " ",
                  {
                    $cond: {
                      if: { $in: ["$nextFollowupTime", [null, ""]] },
                      then: "00:00",
                      else: "$nextFollowupTime"
                    }
                  }
                ],
              },
              format: "%Y-%m-%d %H:%M",
              timezone: "Asia/Kolkata", // 🔥 IMPORTANT
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $match: { followupDateTime: { $ne: null } }
      },
      {
        $match: {
          followupDateTime: { $lt: now }, // ✅ due logic
        },
      },
    ];

    // 👉 total count
    const totalResult = await LEAD.aggregate([
      ...basePipeline,
      { $count: "count" },
    ]);

    const total = totalResult[0]?.count || 0;

    // 👉 paginated data
    const leads = await LEAD.aggregate([
      ...basePipeline,
      { $sort: { followupDateTime: 1 } }, // most overdue first
      { $skip: skip },
      { $limit: limit },

      // populate leadStatus
      {
        $lookup: {
          from: "leadstatuses",
          localField: "leadStatus",
          foreignField: "_id",
          as: "leadStatus",
        },
      },
      { $unwind: { path: "$leadStatus", preserveNullAndEmptyArrays: true } },

      // populate assignedTo
      {
        $lookup: {
          from: "staffs",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedTo",
        },
      },
      { $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true } },

      // populate leadSource
      {
        $lookup: {
          from: "leadsources",
          localField: "leadSource",
          foreignField: "_id",
          as: "leadSource",
        },
      },
      { $unwind: { path: "$leadSource", preserveNullAndEmptyArrays: true } },
    ]);

    return res.status(200).json({
      status: "Success",
      message: "Due followups fetched",
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
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

// Get Lost Leads
// Get Won Leads
exports.getWonLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // First find the Won status
    const wonStatus = await LeadStatus.findOne({ name: { $regex: /^won$/i } }); // Case insensitive
    console.log("wonStatus", req.user);

    if (!wonStatus) {
      return res.status(200).json({
        status: "Success",
        message: "No won leads found",
        pagination: {
          totalRecords: 0,
          currentPage: page,
          totalPages: 0,
          limit,
        },
        data: [],
      });
    }

    const query = {
      leadStatus: wonStatus._id,
    };

    if (req.leadScope === "own" && req.user && req.user._id) {
      query.assignedTo = req.user;
    }
    console.log("query", query);

    const total = await LEAD.countDocuments(query);

    const leads = await LEAD.find(query)
      .populate("leadStatus")
      .populate("leadSource")
      .populate("assignedTo")
      .populate("leadLabel")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
      console.log("leads", leads);

    return res.status(200).json({
      status: "Success",
      message: "Won leads fetched",
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
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

// Get Lost Leads
exports.getLostLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // First find the Lost status
    const lostStatus = await LeadStatus.findOne({ name: { $regex: /^lost$/i } }); // Case insensitive

    if (!lostStatus) {
      return res.status(200).json({
        status: "Success",
        message: "No lost leads found",
        pagination: {
          totalRecords: 0,
          currentPage: page,
          totalPages: 0,
          limit,
        },
        data: [],
      });
    }

    const query = {
      leadStatus: lostStatus._id,
      isActive: true
    };

    if (req.leadScope === "own" && req.user && req.user._id) {
      query.assignedTo = req.user._id;
    }

    const total = await LEAD.countDocuments(query);

    const leads = await LEAD.find(query)
      .populate("leadStatus")
      .populate("leadSource")
      .populate("assignedTo")
      .populate("leadLabel")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      status: "Success",
      message: "Lost leads fetched",
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
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