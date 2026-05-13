const express = require("express");
const router = express.Router();
const settingController = require("../controller/setting");
const authMiddleware = require("../middleware/auth"); 

router.get("/", authMiddleware, settingController.getSettings);
router.post("/", authMiddleware, settingController.updateSettings);
router.get("/:key", authMiddleware, settingController.getSettingByKey);

module.exports = router;
