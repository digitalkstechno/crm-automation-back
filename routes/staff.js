var express = require("express");
var router = express.Router();
let {
  createStaff,
  loginStaff,
  refreshToken,
  fetchAllStaffs,
  fetchAllStaffsForDropdown,
  fetchStaffById,
  staffUpdate,
  staffDelete,
  getCurrentUser,
} = require("../controller/staff");
const authMiddleware = require("../middleware/auth");

router.post("/", createStaff);
router.post("/login", loginStaff);
router.post("/refresh-token", refreshToken);
router.get("/me", authMiddleware, getCurrentUser);
router.get("/", authMiddleware, fetchAllStaffs);
router.get("/dropdown", authMiddleware, fetchAllStaffsForDropdown);
router.get("/:id", authMiddleware, fetchStaffById);
router.put("/:id", authMiddleware, staffUpdate);
router.delete("/:id", authMiddleware, staffDelete);

module.exports = router;