var express = require("express");
var router = express.Router();

router.use("/health", require("./health"));
router.use("/staff", require("./staff"));
router.use("/role", require("./role"));
router.use("/inquirycategory", require("./inquiryCategory"));
router.use("/model", require("./modelSuggestion"));
router.use("/color", require("./color"));
router.use("/customizationtype", require("./customizationType"));
router.use("/clienttype", require("./clientType"));
router.use("/sourcefrom", require("./sourceFrom"));
router.use("/accountmaster", require("./accountMaster"));
router.use("/lead", require("./lead"));
router.use("/report", require("./report"));
router.use("/production", require("./production"));

module.exports = router;
