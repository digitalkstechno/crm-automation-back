const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const clientTypeController = require("../controller/clientType");

router.post("/", authMiddleware, clientTypeController.createClientType);
router.get("/", authMiddleware, clientTypeController.getAllClientTypes);
router.get("/dropdown", authMiddleware, clientTypeController.getClientTypesDropdown);
router.put("/:id", authMiddleware, clientTypeController.updateClientType);
router.delete("/:id", authMiddleware, clientTypeController.deleteClientType);

module.exports = router;
