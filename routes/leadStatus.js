var express = require("express");
var router = express.Router();
let {
  createLeadStatus,
  fetchAllLeadStatus,
  fetchLeadStatusById,
  LeadStatusUpdate,
  LeadStatusDelete,
  bulkReorder,
} = require("../controller/leadStatus");
let authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

router.post(
  "/",
  authMiddleware,
  // authorize("setup", "create"),
  createLeadStatus,
);
router.get(
  "/",
  authMiddleware,
  // authorize("setup", "readAll"),
  fetchAllLeadStatus,
);
router.put("/reorder", authMiddleware, bulkReorder);

router.get(
  "/:id",
  authMiddleware,
  // authorize("setup", "readAll"),
  fetchLeadStatusById,
);
router.put(
  "/:id",
  authMiddleware,
  // authorize("setup", "update"),
  LeadStatusUpdate,
);
router.delete(
  "/:id",
  authMiddleware,
  // authorize("setup", "delete"),
  LeadStatusDelete,
);

module.exports = router;

