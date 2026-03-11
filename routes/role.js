const express = require("express");
const router = express.Router();
const roleController = require("../controller/role");
const auth = require("../middleware/auth");

router.post("/create",  roleController.createRole);
router.get("/fetch-all", auth, roleController.fetchAllRoles);
router.get("/fetch/:id", auth, roleController.fetchRoleById);
router.put("/update/:id", auth, roleController.updateRole);
router.delete("/delete/:id", auth, roleController.deleteRole);
router.get("/statuses", auth, roleController.getAllStatuses);

module.exports = router;
