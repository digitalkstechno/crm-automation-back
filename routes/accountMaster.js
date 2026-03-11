var express = require("express");
var router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const authMiddleware = require("../middleware/auth");
const {
  createAccountMaster,
  fetchAllAccountMaster,
  fetchAccountMasterById,
  updateAccountMaster,
  deleteAccountMaster,
  downloadSampleExcel,
  exportAccountMaster,
  importAccountMaster,
  createPublicAccountMaster
} = require("../controller/accountMaster");

router.post("/public", createPublicAccountMaster);
router.get("/sample-excel", authMiddleware, downloadSampleExcel);
router.get("/export", authMiddleware, exportAccountMaster);
router.post("/import", authMiddleware, upload.single('file'), importAccountMaster);
router.post("/", authMiddleware, createAccountMaster);
router.get("/", authMiddleware, fetchAllAccountMaster);
router.get("/:id", authMiddleware, fetchAccountMasterById);
router.put("/:id", authMiddleware, updateAccountMaster);
router.delete("/:id", authMiddleware, deleteAccountMaster);

module.exports = router;
