const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const sourceFromController = require("../controller/sourceFrom");

router.post("/", authMiddleware, sourceFromController.createSourceFrom);
router.get("/", authMiddleware, sourceFromController.getAllSourceFroms);
router.get("/dropdown", authMiddleware, sourceFromController.getSourceFromsDropdown);
router.put("/:id", authMiddleware, sourceFromController.updateSourceFrom);
router.delete("/:id", authMiddleware, sourceFromController.deleteSourceFrom);

module.exports = router;
