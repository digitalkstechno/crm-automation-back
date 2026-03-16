var express = require("express");
var router = express.Router();
const createUploader = require("../utils/multer");
const upload = createUploader("images/LeadAttachment");
let {
  createLead,
  fetchAllLeads,
  fetchLeadById,
  leadUpdate,
  leadDelete,
  fetchLeadsForKanban,
  updateKanbanStatus,
  getKanbanCounts,
  getLeadCountSummary,
  getUpcomingFollowups,
  getDueFollowups,
  getWonLeads,
  getLostLeads,
} = require("../controller/lead");
const authMiddleware = require("../middleware/auth");
const { authorize, leadReadScope } = require("../middleware/permissions");

router.post("/create", authMiddleware, authorize("lead", "create"), createLead);
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
  "/followups/due",
  authMiddleware,
  leadReadScope(),
  getDueFollowups,
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
  upload.array("attachments"),
  authMiddleware,
  authorize("lead", "update"),
  leadUpdate,
);
router.delete(
  "/:id",
  authMiddleware,
  authorize("lead", "delete"),
  leadDelete,
);
module.exports = router;
