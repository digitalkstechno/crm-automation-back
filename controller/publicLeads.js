const PublicLead = require("../model/publicLeads");
const ExcelJS = require("exceljs");

// ─── Helper ──────────────────────────────────────────────────────────────────
const buildQuery = (reqQuery) => {
  const filter = { isDeleted: false };
  if (reqQuery.search) {
    const escapedSearch = reqQuery.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { whatsapp: { $regex: escapedSearch, $options: "i" } },
      { companyName: { $regex: escapedSearch, $options: "i" } },
    ];
  }
  return filter;
};

// ─── CREATE ──────────────────────────────────────────────────────────────────
/**
 * POST /api/public-leads
 */
exports.createPublicLead = async (req, res) => {
  try {
    const { name, companyName, email, whatsapp, notes } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    let documents = [];
    if (req.files && req.files.length > 0) {
      documents = req.files.map((file) => ({
        fileName: file.originalname,
        fileUrl: `/images/PublicLeadAttachment/${file.filename}`,
      }));
    }

    const lead = await PublicLead.create({
      name,
      companyName,
      email,
      whatsapp,
      notes,
      documents,
    });

    return res.status(201).json({
      success: true,
      message: "Public lead created successfully",
      data: lead,
    });
  } catch (err) {
    console.error("createPublicLead error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─── READ ALL ────────────────────────────────────────────────────────────────
/**
 * GET /api/public-leads?page=1&limit=10&search=
 */
exports.getAllPublicLeads = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = buildQuery(req.query);

    const [leads, total] = await Promise.all([
      PublicLead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PublicLead.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getAllPublicLeads error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─── READ ONE ────────────────────────────────────────────────────────────────
/**
 * GET /api/public-leads/:id
 */
exports.getPublicLeadById = async (req, res) => {
  try {
    const lead = await PublicLead.findById(req.params.id);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Public lead not found" });
    }
    return res.status(200).json({ success: true, data: lead });
  } catch (err) {
    console.error("getPublicLeadById error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
/**
 * PUT /api/public-leads/:id
 */
exports.updatePublicLead = async (req, res) => {
  try {
    const { name, companyName, email, whatsapp, notes } = req.body;

    const lead = await PublicLead.findById(req.params.id);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Public lead not found" });
    }

    // Handle deleteDocuments (if any)
    if (req.body.deleteDocuments) {
      const deleteIds = Array.isArray(req.body.deleteDocuments)
        ? req.body.deleteDocuments
        : [req.body.deleteDocuments];

      const { deleteUploadedFile } = require("../utils/fileHelper");
      for (const docId of deleteIds) {
        const doc = lead.documents.id(docId);
        if (doc) {
          await deleteUploadedFile(doc.fileUrl);
          lead.documents.pull(docId);
        }
      }
    }

    // Handle new documents upload
    if (req.files && req.files.length > 0) {
      const newDocs = req.files.map((file) => ({
        fileName: file.originalname,
        fileUrl: `/images/PublicLeadAttachment/${file.filename}`,
      }));
      lead.documents.push(...newDocs);
    }

    // Update other fields
    if (name !== undefined) lead.name = name;
    if (companyName !== undefined) lead.companyName = companyName;
    if (email !== undefined) lead.email = email;
    if (whatsapp !== undefined) lead.whatsapp = whatsapp;
    if (notes !== undefined) lead.notes = notes;

    await lead.save();

    return res.status(200).json({
      success: true,
      message: "Public lead updated successfully",
      data: lead,
    });
  } catch (err) {
    console.error("updatePublicLead error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─── DELETE (Soft) ───────────────────────────────────────────────────────────
/**
 * DELETE /api/public-leads/:id
 */
exports.deletePublicLead = async (req, res) => {
  try {
    const lead = await PublicLead.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Public lead not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Public lead deleted successfully",
    });
  } catch (err) {
    console.error("deletePublicLead error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─── EXPORT EXCEL ────────────────────────────────────────────────────────────
/**
 * GET /api/public-leads/export
 */
exports.exportPublicLeads = async (req, res) => {
  try {
    const filter = buildQuery(req.query);
    const leads = await PublicLead.find(filter).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Public Leads");

    sheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Company Name", key: "companyName", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "WhatsApp", key: "whatsapp", width: 20 },
      { header: "Notes", key: "notes", width: 40 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF05111E" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    leads.forEach((lead) => {
      sheet.addRow({
        name: lead.name,
        companyName: lead.companyName || "-",
        email: lead.email || "-",
        whatsapp: lead.whatsapp || "-",
        notes: lead.notes || "-",
        createdAt: lead.createdAt
          ? new Date(lead.createdAt).toLocaleDateString("en-IN")
          : "-",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=public-leads-${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error("exportPublicLeads error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─── DELETE DOCUMENT ──────────────────────────────────────────────────────────
/**
 * DELETE /api/public-lead/:id/documents/:documentId
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const lead = await PublicLead.findById(id);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Public lead not found" });
    }

    const doc = lead.documents.id(documentId);
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });
    }

    // delete physical file
    const { deleteUploadedFile } = require("../utils/fileHelper");
    await deleteUploadedFile(doc.fileUrl);

    lead.documents.pull(documentId);
    await lead.save();

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      data: lead,
    });
  } catch (err) {
    console.error("deleteDocument error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};