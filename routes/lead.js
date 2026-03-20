var express = require("express");
var router = express.Router();
const createUploader = require("../utils/multer");
const upload = createUploader("images/LeadAttachment");
let {
  createLead,
  fetchAllLeads,
  fetchMyLeads,
  fetchLeadById,
  leadUpdate,
  leadDelete,
  fetchLeadsForKanban,
  updateKanbanStatus,
  getKanbanCounts,
  getLeadCountSummary,
  getMyLeadSummary,
  getUpcomingFollowups,
  getMyUpcomingFollowups,
  getDueFollowups,
  getMyDueFollowups,
  getWonLeads,
  getLostLeads,
  deleteAttachment,
} = require("../controller/lead");
const authMiddleware = require("../middleware/auth");
const { authorize, leadReadScope } = require("../middleware/permissions");

router.post("/create", authMiddleware, authorize("lead", "create"), upload.array("attachments"), createLead);
router.get("/my", authMiddleware, fetchMyLeads);
router.get("/count-summary/my", authMiddleware, getMyLeadSummary);
router.get("/", authMiddleware, leadReadScope(), fetchAllLeads);
router.get("/kanban", authMiddleware, leadReadScope(), fetchLeadsForKanban);
router.get(
  "/kanban-counts",
  authMiddleware,
  leadReadScope(),
  getKanbanCounts,
);
router.get(
  "/count-summary",
  authMiddleware,
  leadReadScope(),
  getLeadCountSummary,
);
router.get(
  "/followups/upcoming",
  authMiddleware,
  leadReadScope(),
  getUpcomingFollowups,
);
router.get(
  "/followups/upcoming/my",
  authMiddleware,
  getMyUpcomingFollowups,
);
router.get(
  "/followups/due",
  authMiddleware,
  leadReadScope(),
  getDueFollowups,
);
router.get(
  "/followups/due/my",
  authMiddleware,
  getMyDueFollowups,
);
router.get("/won", authMiddleware, leadReadScope(), getWonLeads);
router.get("/lost", authMiddleware, leadReadScope(), getLostLeads);
router.get("/:id", authMiddleware, leadReadScope(), fetchLeadById);
router.put(
  "/:id/kanban-status",
  authMiddleware,
  authorize("lead", "update"),
  updateKanbanStatus,
);
router.put(
  "/:id",
  authMiddleware,
  authorize("lead", "update"),
  upload.array("attachments"),
  leadUpdate,
);
router.delete(
  "/:id",
  authMiddleware,
  authorize("lead", "delete"),
  leadDelete,
);
router.delete('/:leadId/attachments/:attachmentId', authMiddleware, authorize("lead", "delete"), deleteAttachment);
module.exports = router;
