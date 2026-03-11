var express = require("express");
var router = express.Router();
const productionController = require("../controller/production");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, productionController.createProduction);
router.get("/", authMiddleware, productionController.fetchAllProductions);
router.get("/:id", authMiddleware, productionController.fetchProductionById);
router.put("/:id", authMiddleware, productionController.updateProduction);
router.delete("/:id", authMiddleware, productionController.deleteProduction);
router.put("/:id/mark-done", authMiddleware, productionController.markEntryDone);

module.exports = router;
