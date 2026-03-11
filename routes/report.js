const express = require("express");
const router = express.Router();
const reportController = require("../controller/report");
const authMiddleware = require("../middleware/auth");

router.get("/leads", authMiddleware, reportController.downloadLeadsReport);
router.get("/lead-items", authMiddleware, reportController.downloadLeadItemsReport);
router.get("/payments", authMiddleware, reportController.downloadPaymentReport);
router.get("/follow-ups", authMiddleware, reportController.downloadFollowUpReport);
router.get("/accounts", authMiddleware, reportController.downloadAccountMasterReport);
router.get("/staff-performance", authMiddleware, reportController.downloadStaffPerformanceReport);
router.get("/summary", authMiddleware, reportController.downloadSummaryReport);

module.exports = router;
