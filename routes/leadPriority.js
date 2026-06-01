const express = require("express");
const router = express.Router();
const ctrl = require("../controller/leadPriority");
const auth = require("../middleware/auth");

router.get("/", auth, ctrl.getAll);
router.post("/", auth, ctrl.create);
router.get("/:id", auth, ctrl.getById);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
