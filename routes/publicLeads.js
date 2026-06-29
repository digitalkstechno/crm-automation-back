const express = require("express");
const router = express.Router();
const {
  createPublicLead,
  getAllPublicLeads,
  getPublicLeadById,
  updatePublicLead,
  deletePublicLead,
  exportPublicLeads,
  deleteDocument,
} = require("../controller/publicLeads");

const protect = require("../middleware/auth"); // your existing auth middleware
const createUploader = require("../utils/multer");
const upload = createUploader("images/PublicLeadAttachment");

// ── Export (before /:id so it doesn't get captured) ──
router.get("/export", protect, exportPublicLeads);

// ── CRUD ──────────────────────────────────────────────
router.route("/").get(protect, getAllPublicLeads).post(protect, upload.array("documents"), createPublicLead);

router
  .route("/:id")
  .get(protect, getPublicLeadById)
  .put(protect, upload.array("documents"), updatePublicLead)
  .delete(protect, deletePublicLead);

router.delete("/:id/documents/:documentId", protect, deleteDocument);

module.exports = router;
