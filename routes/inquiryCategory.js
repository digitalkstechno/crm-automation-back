var express = require("express");
var router = express.Router();
let {
  createinquiryCategory,
  fetchAllinquiryCategoryies,
  fetchAllinquiryCategoryiesForDropdown,
  fetchinquiryCategoryById,
  inquiryCategoryUpdate,
  inquiryCategoryDelete,
} = require("../controller/inquiryCategory");
const authMiddleware = require("../middleware/auth");

router.post("/",authMiddleware, createinquiryCategory);
router.get("/", authMiddleware, fetchAllinquiryCategoryies);
router.get("/dropdown", authMiddleware, fetchAllinquiryCategoryiesForDropdown);
router.get("/:id", authMiddleware, fetchinquiryCategoryById);
router.put("/:id", authMiddleware, inquiryCategoryUpdate);
router.delete("/:id", authMiddleware, inquiryCategoryDelete);

module.exports = router;
