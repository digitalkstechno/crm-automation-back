const LEAD = require("../model/lead");
const mongoose = require("mongoose");
const STAFF = require("../model/staff");
const { deleteUploadedFile } = require("../utils/fileHelper");
const Team = require("../model/team");
const { incrementCount, decrementCount } = require("../utils/leadCountHelper");
const LeadStatus = require("../model/leadStatus");
const LeadSource = require("../model/leadSources");
const LeadLabel = require("../model/leadLabel");
const Notification = require("../model/notification");
const ExcelJS = require("exceljs");
const fs = require("fs");
const COUNTRY_CODES = require("../utils/countryCodes");

const sanitizeObjectId = (id) => {
  if (id === "" || id === "null" || id === "undefined" || id === null) return undefined;
  return id;
};

exports.createLead = async (req, res) => {
  try {
    const leadData = { ...req.body };

    // Handle leadLabel[] from FormData
    if (req.body["leadLabel[]"]) {
      leadData.leadLabel = Array.isArray(req.body["leadLabel[]"]) ? req.body["leadLabel[]"] : [req.body["leadLabel[]"]];
      delete leadData["leadLabel[]"];
    }

    // Sanitize ObjectIds
    leadData.leadStatus = sanitizeObjectId(leadData.leadStatus);
    leadData.leadSource = sanitizeObjectId(leadData.leadSource);
    leadData.assignedTo = sanitizeObjectId(leadData.assignedTo);


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

    if (leadDetails.assignedTo && (!req.user || String(leadDetails.assignedTo) !== String(req.user._id))) {
      await Notification.create({
        recipient: leadDetails.assignedTo,
        title: "New Lead Assigned",
        message: `You have been assigned to a new lead: ${leadDetails.fullName}`,
        type: "lead",
        relatedId: leadDetails._id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

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
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { contact: { $regex: escapedSearch, $options: "i" } },
        { countryCode: { $regex: escapedSearch, $options: "i" } },
        { $expr: { $regexMatch: { input: { $concat: ["$countryCode", "$contact"] }, regex: escapedSearch, options: "i" } } },
        { companyName: { $regex: escapedSearch, $options: "i" } },
        { priority: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    /* =====================
       STATUS FILTER
    ====================== */
    if (status) {
      const statusArr = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statusArr.length === 1) {
        query.leadStatus = statusArr[0];
      } else if (statusArr.length > 1) {
        query.leadStatus = { $in: statusArr };
      }
    }

    /* =====================
       SOURCE FILTER
    ====================== */
    if (source) {
      const sourceArr = source.split(',').map(s => s.trim()).filter(Boolean);
      if (sourceArr.length === 1) {
        query.leadSource = sourceArr[0];
      } else if (sourceArr.length > 1) {
        query.leadSource = { $in: sourceArr };
      }
    }

    /* =====================
       STAFF FILTER
    ====================== */
    if (staff) {
      const staffArr = staff.split(',').map(s => s.trim()).filter(Boolean);
      if (staffArr.length === 1) {
        query.assignedTo = staffArr[0];
      } else if (staffArr.length > 1) {
        query.assignedTo = { $in: staffArr };
      }
    }

    /* =====================
       DATE RANGE FILTER
    ====================== */
    /* =====================
       DATE RANGE FILTER
    ====================== */
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

    // 🔥 SCOPE & PERMISSIONS
    if (req.leadScope === "own" && req.user && req.user._id) {
      // Find team members
      const myTeams = req.user.teams || [];
      const ledTeams = await Team.find({ _id: { $in: myTeams }, teamLeader: req.user._id }).select("_id");
      const ledTeamIds = ledTeams.map(t => t._id);
      const teamMembers = await STAFF.find({ teams: { $in: ledTeamIds } }).select("_id");
      const teamMemberIds = teamMembers.map(m => m._id);

      const allowedIds = [req.user._id, ...teamMemberIds];

      if (query.assignedTo) {
        // If filtering by staff, take intersection
        if (query.assignedTo.$in) {
          query.assignedTo.$in = query.assignedTo.$in.filter(id =>
            allowedIds.some(aid => aid.toString() === id.toString())
          );
        } else {
          const isAllowed = allowedIds.some(aid => aid.toString() === query.assignedTo.toString());
          if (!isAllowed) query.assignedTo = { $in: [] }; // No match
        }
      } else {
        query.assignedTo = { $in: allowedIds };
      }
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
      .populate("assignedTo")
      .populate("followUps.staff", "fullName email");

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
      .populate({ path: "assignedTo" })
      .populate({ path: "leadLabel" })
      .populate({ path: "followUps.staff", select: "fullName email" });
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
    return res.status(400).json({
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

    // Sanitize ObjectIds
    updateData.leadStatus = sanitizeObjectId(updateData.leadStatus);
    updateData.leadSource = sanitizeObjectId(updateData.leadSource);
    updateData.assignedTo = sanitizeObjectId(updateData.assignedTo);


    let currentAttachments = [...(oldLeads.attachments || [])];

    // Handle deleteAttachments[] from FormData
    if (req.body["deleteAttachments[]"]) {
      const deleteIds = Array.isArray(req.body["deleteAttachments[]"])
        ? req.body["deleteAttachments[]"]
        : [req.body["deleteAttachments[]"]];

      // Filter out attachments to be deleted and delete them from filesystem
      currentAttachments = currentAttachments.filter(att => {
        const id = att._id?.toString() || att.path;
        if (deleteIds.includes(id)) {
          if (att.filename) {
            deleteUploadedFile("images/LeadAttachment", att.filename);
          }
          return false;
        }
        return true;
      });
    }

    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map((el) => ({
        originalName: el.originalname,
        filename: el.filename,
        path: `/images/LeadAttachment/${el.filename}`,
      }));
      updateData.attachments = [...currentAttachments, ...newAttachments];
    } else if (req.body["deleteAttachments[]"]) {
      // If no new files but some were deleted, we still need to update the list
      updateData.attachments = currentAttachments;
    }

    // 🔹 Follow-up staff injection & data sanitization
    if (updateData.followUps && Array.isArray(updateData.followUps)) {
      updateData.followUps = updateData.followUps.map(f => {
        if (!f.staff && req.user && req.user._id) {
          f.staff = req.user._id;
        }
        return f;
      });
    }

    if (updateData.nextFollowupDate === "") {
      updateData.nextFollowupDate = null;
    }

    let updatedLeads = await LEAD.findByIdAndUpdate(leadId, updateData, {
      new: true,
    })
      .populate("leadStatus")
      .populate("leadSource")
      .populate("assignedTo")
      .populate("leadLabel")
      .populate("followUps.staff", "fullName email");

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

    // 🔹 Notification handling for reassignment
    const oldStaff = oldLeads.assignedTo ? String(oldLeads.assignedTo._id || oldLeads.assignedTo) : null;
    const newStaff = updatedLeads.assignedTo ? String(updatedLeads.assignedTo._id || updatedLeads.assignedTo) : null;

    if (newStaff && oldStaff !== newStaff && (!req.user || newStaff !== String(req.user._id))) {
      await Notification.create({
        recipient: newStaff,
        title: "Lead Assigned",
        message: `You have been assigned to the lead: ${updatedLeads.fullName}`,
        type: "lead",
        relatedId: updatedLeads._id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
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
    return res.status(400).json({
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
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchLeadsForKanban = async (req, res) => {
  try {
    const { search, status, source, staff, date } = req.query;

    const match = {};
    const myOnly = req.query.my === 'true';
    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      const myTeams = req.user.teams || [];
      const ledTeams = await Team.find({ _id: { $in: myTeams }, teamLeader: req.user._id }).select("_id");
      const ledTeamIds = ledTeams.map(t => t._id);
      const teamMembers = await STAFF.find({ teams: { $in: ledTeamIds } }).select("_id");
      const teamMemberIds = teamMembers.map(m => m._id);
      match.assignedTo = { $in: [req.user._id, ...teamMemberIds] };
    }

    // 🔥 SEARCH FILTER
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { contact: { $regex: escapedSearch, $options: "i" } },
        { countryCode: { $regex: escapedSearch, $options: "i" } },
        { $expr: { $regexMatch: { input: { $concat: ["$countryCode", "$contact"] }, regex: escapedSearch, options: "i" } } },
        { companyName: { $regex: escapedSearch, $options: "i" } },
        { priority: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // 🔥 STATUS FILTER (handle comma-separated values)
    if (status) {
      const statusArr = status.split(',').filter(s => s.trim());
      if (statusArr.length === 1) {
        match.leadStatus = statusArr[0];
      } else if (statusArr.length > 1) {
        match.leadStatus = { $in: statusArr };
      }
    }

    // 🔥 SOURCE FILTER (handle comma-separated values)
    if (source) {
      const sourceArr = source.split(',').filter(s => s.trim());
      if (sourceArr.length === 1) {
        match.leadSource = sourceArr[0];
      } else if (sourceArr.length > 1) {
        match.leadSource = { $in: sourceArr };
      }
    }

    // 🔥 STAFF FILTER (handle comma-separated values)
    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim());
      const selectedIds = staffArr.map(id => id.trim());

      if (match.assignedTo && match.assignedTo.$in) {
        match.assignedTo.$in = selectedIds.filter(id =>
          match.assignedTo.$in.some(aid => aid.toString() === id)
        );
      } else {
        if (selectedIds.length === 1) match.assignedTo = selectedIds[0];
        else match.assignedTo = { $in: selectedIds };
      }
    }

    // 🔥 DATE FILTER
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    }

    const allStatuses = await LeadStatus.find().sort({ order: 1 });

    // If statuses are selected, only return those statuses
    const statusesToFetch = status
      ? allStatuses.filter(s => {
        const statusArr = status.split(',');
        return statusArr.includes(s._id.toString());
      })
      : allStatuses;

    const kanbanData = await Promise.all(
      statusesToFetch.map(async (status) => {
        const leadMatch = { ...match, leadStatus: status._id };
        const totalCount = await LEAD.countDocuments(leadMatch);

        return {
          statusId: status._id,
          statusName: status.name,
          totalCount,
          leads: [], // empty array, frontend lazy-loads this via /kanban-status
        };
      })
    );

    return res.status(200).json({
      status: "Success",
      data: kanbanData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchKanbanLeadsByStatus = async (req, res) => {
  try {
    const { statusId, search, source, staff, date, page = 1, limit = 10 } = req.query;
    const match = { leadStatus: new mongoose.Types.ObjectId(statusId) };
    const myOnly = req.query.my === 'true';

    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      const myTeams = req.user.teams || [];
      const ledTeams = await Team.find({ _id: { $in: myTeams }, teamLeader: req.user._id }).select("_id");
      const ledTeamIds = ledTeams.map(t => t._id);
      const teamMembers = await STAFF.find({ teams: { $in: ledTeamIds } }).select("_id");
      const teamMemberIds = teamMembers.map(m => m._id);
      match.assignedTo = { $in: [req.user._id, ...teamMemberIds] };
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { contact: { $regex: escapedSearch, $options: "i" } },
        { countryCode: { $regex: escapedSearch, $options: "i" } },
        { $expr: { $regexMatch: { input: { $concat: ["$countryCode", "$contact"] }, regex: escapedSearch, options: "i" } } },
        { companyName: { $regex: escapedSearch, $options: "i" } },
        { priority: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (source) {
      const sourceArr = source.split(',').filter(s => s.trim()).map(id => new mongoose.Types.ObjectId(id));
      if (sourceArr.length === 1) match.leadSource = sourceArr[0];
      else if (sourceArr.length > 1) match.leadSource = { $in: sourceArr };
    }

    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim()).map(id => new mongoose.Types.ObjectId(id));
      if (match.assignedTo && match.assignedTo.$in) {
        match.assignedTo.$in = staffArr.filter(id =>
          match.assignedTo.$in.some(aid => aid.toString() === id.toString())
        );
      } else {
        if (staffArr.length === 1) match.assignedTo = staffArr[0];
        else match.assignedTo = { $in: staffArr };
      }
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const leads = await LEAD.find(match)
      .populate("leadStatus")
      .populate("leadSource")
      .populate("leadLabel")
      .populate("assignedTo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LEAD.countDocuments(match);

    return res.status(200).json({
      status: "Success",
      data: leads,
      pagination: {
        totalRecords: total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      }
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
    const { search, status, source, staff, date } = req.query;

    const match = {};
    const myOnly = req.query.my === 'true';
    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      const myTeams = req.user.teams || [];
      const ledTeams = await Team.find({ _id: { $in: myTeams }, teamLeader: req.user._id }).select("_id");
      const ledTeamIds = ledTeams.map(t => t._id);
      const teamMembers = await STAFF.find({ teams: { $in: ledTeamIds } }).select("_id");
      const teamMemberIds = teamMembers.map(m => m._id);
      match.assignedTo = { $in: [req.user._id, ...teamMemberIds].map(id => new mongoose.Types.ObjectId(id)) };
    }

    // 🔥 SEARCH FILTER
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { contact: { $regex: escapedSearch, $options: "i" } },
        { countryCode: { $regex: escapedSearch, $options: "i" } },
        { $expr: { $regexMatch: { input: { $concat: ["$countryCode", "$contact"] }, regex: escapedSearch, options: "i" } } },
        { companyName: { $regex: escapedSearch, $options: "i" } },
        { priority: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // 🔥 SOURCE FILTER (handle comma-separated values)
    if (source) {
      const sourceArr = source.split(',').filter(s => s.trim()).map(id => new mongoose.Types.ObjectId(id));
      if (sourceArr.length === 1) {
        match.leadSource = sourceArr[0];
      } else if (sourceArr.length > 1) {
        match.leadSource = { $in: sourceArr };
      }
    }

    // 🔥 STAFF FILTER (handle comma-separated values)
    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim()).map(id => new mongoose.Types.ObjectId(id));
      if (match.assignedTo && match.assignedTo.$in) {
        match.assignedTo.$in = staffArr.filter(id =>
          match.assignedTo.$in.some(aid => aid.toString() === id.toString())
        );
      } else {
        if (staffArr.length === 1) match.assignedTo = staffArr[0];
        else match.assignedTo = { $in: staffArr };
      }
    }

    // 🔥 DATE FILTER
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
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

    const allStatuses = await LeadStatus.find().select("_id name").sort({ order: 1 });

    const { search, status, source, staff, date, from, to } = req.query;

    const baseMatch = {};
    const myOnly = req.query.my === 'true';
    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      const myTeams = req.user.teams || [];
      const ledTeams = await Team.find({ _id: { $in: myTeams }, teamLeader: req.user._id }).select("_id");
      const ledTeamIds = ledTeams.map(t => t._id);
      const teamMembers = await STAFF.find({ teams: { $in: ledTeamIds } }).select("_id");
      const teamMemberIds = teamMembers.map(m => m._id);
      baseMatch.assignedTo = { $in: [req.user._id, ...teamMemberIds].map(id => new mongoose.Types.ObjectId(id)) };
    }

    // 🔥 SEARCH FILTER
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      baseMatch.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { contact: { $regex: escapedSearch, $options: "i" } },
        { countryCode: { $regex: escapedSearch, $options: "i" } },
        { $expr: { $regexMatch: { input: { $concat: ["$countryCode", "$contact"] }, regex: escapedSearch, options: "i" } } },
        { companyName: { $regex: escapedSearch, $options: "i" } },
        { priority: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // 🔥 STATUS FILTER (handle comma-separated values)
    if (status) {
      const statusArr = status.split(',').filter(s => s.trim()).map(id => new mongoose.Types.ObjectId(id));
      if (statusArr.length === 1) {
        baseMatch.leadStatus = statusArr[0];
      } else if (statusArr.length > 1) {
        baseMatch.leadStatus = { $in: statusArr };
      }
    }

    // 🔥 SOURCE FILTER (handle comma-separated values)
    if (source) {
      const sourceArr = source.split(',').filter(s => s.trim()).map(id => new mongoose.Types.ObjectId(id));
      if (sourceArr.length === 1) {
        baseMatch.leadSource = sourceArr[0];
      } else if (sourceArr.length > 1) {
        baseMatch.leadSource = { $in: sourceArr };
      }
    }

    // 🔥 STAFF FILTER (handle comma-separated values)
    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim()).map(id => new mongoose.Types.ObjectId(id));
      if (baseMatch.assignedTo && baseMatch.assignedTo.$in) {
        baseMatch.assignedTo.$in = staffArr.filter(id =>
          baseMatch.assignedTo.$in.some(aid => aid.toString() === id.toString())
        );
      } else {
        if (staffArr.length === 1) baseMatch.assignedTo = staffArr[0];
        else baseMatch.assignedTo = { $in: staffArr };
      }
    }

    // 🔥 DATE RANGE FILTER
    if (from || to) {
      const start = from ? new Date(from) : new Date(0);
      start.setHours(0, 0, 0, 0);

      const end = to ? new Date(to) : new Date();
      end.setHours(23, 59, 59, 999);

      baseMatch.createdAt = { $gte: start, $lte: end };
    } else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      baseMatch.createdAt = { $gte: start, $lte: end };
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

          totalRevenue: [
            Object.keys(baseMatch).length > 0 ? { $match: baseMatch } : null,
            {
              $group: {
                _id: null,
                total: { $sum: "$paymentAmount" },
              },
            },
          ].filter(Boolean),
        },
      },
    ]);

    const totalLeads = counts[0]?.totalLeads[0]?.count || 0;
    const monthlyLeads = counts[0]?.monthlyLeads[0]?.count || 0;
    const totalRevenue = counts[0]?.totalRevenue[0]?.total || 0;
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
        totalRevenue,
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

    const { search, source, staff, date } = req.query;

    // First find the Won status
    const wonStatus = await LeadStatus.findOne({ name: { $regex: /^won$/i } }); // Case insensitive

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

    const match = {
      leadStatus: wonStatus._id,
      isActive: true
    };
    const myOnly = req.query.my === 'true';
    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      const myTeams = req.user.teams || [];
      const ledTeams = await Team.find({ _id: { $in: myTeams }, teamLeader: req.user._id }).select("_id");
      const ledTeamIds = ledTeams.map(t => t._id);
      const teamMembers = await STAFF.find({ teams: { $in: ledTeamIds } }).select("_id");
      const teamMemberIds = teamMembers.map(m => m._id);
      match.assignedTo = { $in: [req.user._id, ...teamMemberIds].map(id => new mongoose.Types.ObjectId(id)) };
    }

    // 🔥 SEARCH FILTER
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { contact: { $regex: escapedSearch, $options: "i" } },
        { countryCode: { $regex: escapedSearch, $options: "i" } },
        { $expr: { $regexMatch: { input: { $concat: ["$countryCode", "$contact"] }, regex: escapedSearch, options: "i" } } },
        { companyName: { $regex: escapedSearch, $options: "i" } },
        { priority: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // 🔥 SOURCE FILTER (handle comma-separated values)
    if (source) {
      const sourceArr = source.split(',').filter(s => s.trim()).map(id => new mongoose.Types.ObjectId(id));
      if (sourceArr.length === 1) {
        match.leadSource = sourceArr[0];
      } else if (sourceArr.length > 1) {
        match.leadSource = { $in: sourceArr };
      }
    }

    // 🔥 STAFF FILTER (handle comma-separated values)
    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim()).map(id => new mongoose.Types.ObjectId(id));
      if (match.assignedTo && match.assignedTo.$in) {
        match.assignedTo.$in = staffArr.filter(id =>
          match.assignedTo.$in.some(aid => aid.toString() === id.toString())
        );
      } else {
        if (staffArr.length === 1) match.assignedTo = staffArr[0];
        else match.assignedTo = { $in: staffArr };
      }
    }

    // 🔥 DATE FILTER
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    }

    const total = await LEAD.countDocuments(match);

    const leads = await LEAD.find(match)
      .populate("leadStatus")
      .populate("leadSource")
      .populate("assignedTo")
      .populate("leadLabel")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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

    const { search, source, staff, date } = req.query;

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

    const myOnly = req.query.my === 'true';
    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      const myTeams = req.user.teams || [];
      const ledTeams = await Team.find({ _id: { $in: myTeams }, teamLeader: req.user._id }).select("_id");
      const ledTeamIds = ledTeams.map(t => t._id);
      const teamMembers = await STAFF.find({ teams: { $in: ledTeamIds } }).select("_id");
      const teamMemberIds = teamMembers.map(m => m._id);
      query.assignedTo = { $in: [req.user._id, ...teamMemberIds].map(id => new mongoose.Types.ObjectId(id)) };
    }

    // 🔥 SEARCH FILTER
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { contact: { $regex: escapedSearch, $options: "i" } },
        { countryCode: { $regex: escapedSearch, $options: "i" } },
        { $expr: { $regexMatch: { input: { $concat: ["$countryCode", "$contact"] }, regex: escapedSearch, options: "i" } } },
        { companyName: { $regex: escapedSearch, $options: "i" } },
        { priority: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // 🔥 SOURCE FILTER
    if (source) {
      query.leadSource = source;
    }

    // 🔥 STAFF FILTER
    if (staff) {
      query.assignedTo = staff;
    }

    // 🔥 DATE FILTER
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const total = await LEAD.countDocuments(query);

    const leads = await LEAD.find(query)
      .populate("leadStatus")
      .populate("leadSource")
      .populate("assignedTo")
      .populate("leadLabel")
      .sort({ createdAt: -1 })
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

// DELETE /api/leads/:leadId/attachments/:attachmentId
exports.deleteAttachment = async (req, res) => {
  try {
    const { leadId, attachmentId } = req.params;

    const lead = await LEAD.findById(leadId);
    if (!lead) {
      return res.status(400).json({ status: "Fail", message: "Lead not found" });
    }

    // Find the attachment
    const attachment = lead.attachments.find(
      (att) => att._id?.toString() === attachmentId || att.path === attachmentId
    );

    if (!attachment) {
      return res.status(400).json({ status: "Fail", message: "Attachment not found" });
    }

    // Delete file from filesystem
    if (attachment.filename) {
      deleteUploadedFile("images/LeadAttachment", attachment.filename);
    }

    // Remove from DB
    lead.attachments = lead.attachments.filter(
      (att) => att._id?.toString() !== attachmentId && att.path !== attachmentId
    );
    await lead.save();

    return res.status(200).json({
      status: "Success",
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.exportLeadsToExcel = async (req, res) => {
  try {
    const { search = "", status, source, staff, from, to, date } = req.query;

    const query = {};

    // SEARCH
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { contact: { $regex: escapedSearch, $options: "i" } },
        { countryCode: { $regex: escapedSearch, $options: "i" } },
        { $expr: { $regexMatch: { input: { $concat: ["$countryCode", "$contact"] }, regex: escapedSearch, options: "i" } } },
        { companyName: { $regex: escapedSearch, $options: "i" } },
        { priority: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // STATUS
    if (status) {
      const arr = status.split(",").map((s) => s.trim()).filter(Boolean);
      query.leadStatus = arr.length === 1 ? arr[0] : { $in: arr };
    }

    // SOURCE
    if (source) {
      const arr = source.split(",").map((s) => s.trim()).filter(Boolean);
      query.leadSource = arr.length === 1 ? arr[0] : { $in: arr };
    }

    // STAFF
    if (staff) {
      const arr = staff.split(",").map((s) => s.trim()).filter(Boolean);
      query.assignedTo = arr.length === 1 ? arr[0] : { $in: arr };
    }

    // DATE RANGE
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

    // OWN SCOPE
    if (req.leadScope === "own" && req.user && req.user._id) {
      const myTeams = req.user.teams || [];
      const ledTeams = await Team.find({ _id: { $in: myTeams }, teamLeader: req.user._id }).select("_id");
      const ledTeamIds = ledTeams.map(t => t._id);
      const teamMembers = await STAFF.find({ teams: { $in: ledTeamIds } }).select("_id");
      const teamMemberIds = teamMembers.map(m => m._id);
      const allowedIds = [req.user._id, ...teamMemberIds];

      if (query.assignedTo) {
        if (query.assignedTo.$in) {
          query.assignedTo.$in = query.assignedTo.$in.filter(id =>
            allowedIds.some(aid => aid.toString() === id.toString())
          );
        } else {
          const isAllowed = allowedIds.some(aid => aid.toString() === query.assignedTo.toString());
          if (!isAllowed) query.assignedTo = { $in: [] };
        }
      } else {
        query.assignedTo = { $in: allowedIds };
      }
    }

    const leads = await LEAD.find(query)
      .sort({ createdAt: -1 })
      .populate("leadStatus", "name")
      .populate("leadSource", "name")
      .populate("assignedTo", "fullName email");

    // ── Build Excel ───────────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CRM System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Leads", {
      pageSetup: { fitToPage: true, orientation: "landscape" },
    });

    // Column definitions
    sheet.columns = [
      { header: "S.No", key: "sno", width: 7 },
      { header: "Full Name", key: "fullName", width: 22 },
      { header: "Email", key: "email", width: 28 },
      { header: "Country Code", key: "countryCode", width: 15 },
      { header: "Phone", key: "contact", width: 16 },
      { header: "Company", key: "company", width: 22 },
      { header: "Lead Status", key: "status", width: 18 },
      { header: "Lead Source", key: "source", width: 18 },
      { header: "Assigned To", key: "assigned", width: 20 },
      { header: "Priority", key: "priority", width: 12 },
      { header: "Created At", key: "createdAt", width: 18 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E40AF" }, // deep blue
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF1E40AF" } },
      };
    });
    headerRow.height = 28;

    // Fill data rows
    leads.forEach((lead, idx) => {
      const row = sheet.addRow({
        sno: idx + 1,
        fullName: lead.fullName || "",
        email: lead.email || "",
        countryCode: lead.countryCode || "+91",
        contact: lead.contact || "",
        company: lead.companyName || "",
        status: lead.leadStatus?.name || "",
        source: lead.leadSource?.name || "",
        assigned: lead.assignedTo?.fullName || "",
        priority: lead.priority || "",
        createdAt: lead.createdAt
          ? new Date(lead.createdAt).toLocaleDateString("en-IN")
          : "",
      });

      // Alternate row shading
      if (idx % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F4FF" },
          };
        });
      }

      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
      row.height = 22;
    });

    // Freeze header
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    // Stream the file
    const fileName = `leads_export_${Date.now()}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// BULK IMPORT – Step 1: Download Template (with master-data dropdowns)
// ────────────────────────────────────────────────────────────────────────────
exports.downloadImportTemplate = async (req, res) => {
  try {
    const [statuses, sources, labels] = await Promise.all([
      LeadStatus.find().select("name").lean(),
      LeadSource.find().select("name").lean(),
      LeadLabel.find().select("name").lean(),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CRM System";
    workbook.created = new Date();

    // ── Hidden master sheets (for dropdown source data) ────────────────────
    const statusSheet = workbook.addWorksheet("__statuses", { state: "veryHidden" });
    statusSheet.addRows(statuses.map((s) => [s.name]));

    const sourceSheet = workbook.addWorksheet("__sources", { state: "veryHidden" });
    sourceSheet.addRows(sources.map((s) => [s.name]));

    const prioritySheet = workbook.addWorksheet("__priorities", { state: "veryHidden" });
    prioritySheet.addRows([["high"], ["medium"], ["low"]]);

    const labelSheet = workbook.addWorksheet("__labels", { state: "veryHidden" });
    labelSheet.addRows(labels.map((l) => [l.name]));

    const countryCodeSheet = workbook.addWorksheet("__countryCodes", { state: "veryHidden" });
    countryCodeSheet.addRows(COUNTRY_CODES.map((c) => [c.code]));

    // ── Main data sheet ───────────────────────────────────────────────────
    const sheet = workbook.addWorksheet("Leads Import", {
      pageSetup: { fitToPage: true, orientation: "landscape" },
    });

    // Column definitions – only core importable fields
    const COLUMNS = [
      { header: "Full Name *", key: "fullName", width: 24 },
      { header: "Country Code *", key: "countryCode", width: 15 },
      { header: "Contact *", key: "contact", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Company Name *", key: "companyName", width: 24 },
      { header: "Address", key: "address", width: 28 },
      { header: "Lead Status *", key: "leadStatus", width: 20 },
      { header: "Lead Source *", key: "leadSource", width: 20 },
      { header: "Priority", key: "priority", width: 14 },
      { header: "Note", key: "note", width: 30 },
    ];

    sheet.columns = COLUMNS;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { bottom: { style: "medium", color: { argb: "FF1E40AF" } } };
    });
    headerRow.height = 30;

    // Add a sample row
    const sampleRow = sheet.addRow({
      fullName: "John Doe",
      countryCode: "+91",
      contact: "9876543210",
      email: "john@example.com",
      companyName: "Acme Corp",
      address: "123 Main St",
      leadStatus: statuses[0]?.name || "",
      leadSource: sources[0]?.name || "",
      priority: "medium",
      note: "Sample note",
    });
    sampleRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
      cell.alignment = { vertical: "middle" };
    });
    sampleRow.height = 22;

    // ── Data validation (dropdowns) for rows 2-1001 ───────────────────────
    const COL = { countryCode: 2, leadStatus: 7, leadSource: 8, priority: 9 }; // 1-based col index

    const statusFormula = `__statuses!$A$1:$A$${statuses.length || 1}`;
    const sourceFormula = `__sources!$A$1:$A$${sources.length || 1}`;
    const priorityFormula = `__priorities!$A$1:$A$3`;
    const countryCodeFormula = `__countryCodes!$A$1:$A$${COUNTRY_CODES.length}`;

    for (let row = 2; row <= 1001; row++) {
      sheet.getCell(row, COL.countryCode).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [countryCodeFormula],
        showErrorMessage: true,
        errorTitle: "Invalid Country Code",
        error: "Please select a valid Country Code from the dropdown.",
      };
      sheet.getCell(row, COL.leadStatus).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [statusFormula],
        showErrorMessage: true,
        errorTitle: "Invalid Status",
        error: "Please select a valid Lead Status from the dropdown.",
      };
      sheet.getCell(row, COL.leadSource).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [sourceFormula],
        showErrorMessage: true,
        errorTitle: "Invalid Source",
        error: "Please select a valid Lead Source from the dropdown.",
      };
      sheet.getCell(row, COL.priority).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [priorityFormula],
        showErrorMessage: true,
        errorTitle: "Invalid Priority",
        error: "Priority must be: high, medium, or low",
      };
    }

    // Freeze header
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Stream the file
    const fileName = "leads_import_template.xlsx";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// BULK IMPORT – Step 2: Process uploaded Excel, validate & insert
// Returns: { imported, failed } – and if failed > 0, sends back a failed-rows Excel
// ────────────────────────────────────────────────────────────────────────────
exports.bulkImportLeads = async (req, res) => {
  const filePath = req.file?.path;
  const assignedTo = sanitizeObjectId(req.body.assignedTo);
  try {
    if (!req.file) {
      return res.status(400).json({ status: "Fail", message: "No file uploaded" });
    }

    // Load master data for name→ID lookup
    const [statuses, sources] = await Promise.all([
      LeadStatus.find().lean(),
      LeadSource.find().lean(),
    ]);

    const statusMap = {};
    statuses.forEach((s) => { statusMap[s.name.trim().toLowerCase()] = s._id; });

    const sourceMap = {};
    sources.forEach((s) => { sourceMap[s.name.trim().toLowerCase()] = s._id; });

    // Parse Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet("Leads Import");
    if (!sheet) {
      return res.status(400).json({ status: "Fail", message: "Invalid template: 'Leads Import' sheet not found" });
    }

    const VALID_PRIORITIES = ["high", "medium", "low"];

    const successRows = [];
    const failedRows = []; // { rowNum, rowData, errors }

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const getCellValue = (col) => {
        const cell = row.getCell(col);
        const val = cell.value;
        if (val === null || val === undefined) return "";
        if (typeof val === "object" && val.richText) {
          return val.richText.map((rt) => rt.text).join("").trim();
        }
        return String(val).trim();
      };

      const fullName = getCellValue(1);
      const countryCode = getCellValue(2);
      const contact = getCellValue(3);
      const email = getCellValue(4);
      const companyName = getCellValue(5);
      const address = getCellValue(6);
      const statusName = getCellValue(7);
      const sourceName = getCellValue(8);
      const priority = getCellValue(9).toLowerCase() || "medium";
      const note = getCellValue(10);

      // Skip completely empty rows
      if (!fullName && !contact && !companyName && !statusName && !sourceName) return;

      const errors = [];

      if (!fullName) errors.push("Full Name is required");
      if (!countryCode) errors.push("Country Code is required");
      if (!contact) errors.push("Contact is required");
      if (!companyName) errors.push("Company Name is required");

      const statusId = statusName ? statusMap[statusName.toLowerCase()] : null;
      if (!statusName) errors.push("Lead Status is required");
      else if (!statusId) errors.push(`Lead Status '${statusName}' not found in master`);

      const sourceId = sourceName ? sourceMap[sourceName.toLowerCase()] : null;
      if (!sourceName) errors.push("Lead Source is required");
      else if (!sourceId) errors.push(`Lead Source '${sourceName}' not found in master`);

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Invalid email format");
      }

      if (priority && !VALID_PRIORITIES.includes(priority)) {
        errors.push(`Priority must be high / medium / low (got '${priority}')`);
      }

      if (errors.length > 0) {
        failedRows.push({ rowNumber, fullName, countryCode, contact, email, companyName, address, statusName, sourceName, priority, note, errors: errors.join(" | ") });
      } else {
        successRows.push({ fullName, countryCode, contact, email: email || undefined, companyName, address: address || undefined, leadStatus: statusId, leadSource: sourceId, priority: priority || "medium", note: note || undefined, assignedTo });
      }
    });

    // Bulk insert successful rows
    let imported = 0;
    const insertErrors = [];
    for (const leadData of successRows) {
      try {
        const lead = await LEAD.create(leadData);
        await incrementCount({ statusId: lead.leadStatus, sourceId: lead.leadSource });
        imported++;
      } catch (err) {
        // Move to failed if DB validation fails (e.g. duplicate metaLeadId)
        insertErrors.push({ ...leadData, errors: err.message });
      }
    }

    // Merge DB insert errors into failedRows
    const allFailed = [
      ...failedRows,
      ...insertErrors.map((r) => ({
        rowNumber: "DB",
        fullName: r.fullName,
        countryCode: r.countryCode,
        contact: r.contact,
        email: r.email || "",
        companyName: r.companyName,
        address: r.address || "",
        statusName: r.leadStatus?.toString() || "",
        sourceName: r.leadSource?.toString() || "",
        priority: r.priority,
        note: r.note || "",
        errors: r.errors,
      })),
    ];

    // Clean up uploaded temp file
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // If there are failed rows, return them as Excel
    if (allFailed.length > 0) {
      const failWb = new ExcelJS.Workbook();
      const failSheet = failWb.addWorksheet("Failed Leads");

      failSheet.columns = [
        { header: "Row #", key: "rowNumber", width: 8 },
        { header: "Full Name", key: "fullName", width: 22 },
        { header: "Country Code", key: "countryCode", width: 15 },
        { header: "Contact", key: "contact", width: 16 },
        { header: "Email", key: "email", width: 26 },
        { header: "Company Name", key: "companyName", width: 22 },
        { header: "Address", key: "address", width: 26 },
        { header: "Lead Status", key: "statusName", width: 18 },
        { header: "Lead Source", key: "sourceName", width: 18 },
        { header: "Priority", key: "priority", width: 12 },
        { header: "Note", key: "note", width: 28 },
        { header: "Failure Reason", key: "errors", width: 50 },
      ];

      // Style header
      const hRow = failSheet.getRow(1);
      hRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      hRow.height = 28;

      allFailed.forEach((f) => {
        const r = failSheet.addRow({
          rowNumber: f.rowNumber,
          fullName: f.fullName,
          countryCode: f.countryCode,
          contact: f.contact,
          email: f.email,
          companyName: f.companyName,
          address: f.address,
          statusName: f.statusName,
          sourceName: f.sourceName,
          priority: f.priority,
          note: f.note,
          errors: f.errors,
        });
        r.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
          cell.alignment = { vertical: "middle" };
        });
        // Highlight error column in red
        r.getCell(11).font = { color: { argb: "FFDC2626" }, bold: true };
        r.height = 20;
      });

      failSheet.views = [{ state: "frozen", ySplit: 1 }];

      // Add summary at top
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="failed_leads_${Date.now()}.xlsx"`);
      res.setHeader("X-Import-Imported", String(imported));
      res.setHeader("X-Import-Failed", String(allFailed.length));
      await failWb.xlsx.write(res);
      return res.end();
    }

    // All rows succeeded
    return res.status(200).json({
      status: "Success",
      message: `${imported} lead(s) imported successfully`,
      data: { imported, failed: 0 },
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) { }
    }
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.bulkAssignLeads = async (req, res) => {
  try {
    const { leadIds, staffId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      throw new Error("No leads selected");
    }

    if (!staffId) {
      throw new Error("No staff member selected");
    }

    const assignedTo = sanitizeObjectId(staffId);

    // Update leads
    const result = await LEAD.updateMany(
      { _id: { $in: leadIds } },
      { $set: { assignedTo: assignedTo } }
    );

    // Notifications
    if (assignedTo && (!req.user || String(assignedTo) !== String(req.user._id))) {
      await Notification.create({
        recipient: assignedTo,
        title: "Bulk Leads Assigned",
        message: `You have been assigned to ${leadIds.length} leads.`,
        type: "lead",
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return res.status(200).json({
      status: "Success",
      message: `Successfully assigned ${result.modifiedCount} leads`,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};
