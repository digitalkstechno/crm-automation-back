const express = require("express");
const router = express.Router();
const colorController = require("../controller/color");
const auth = require("../middleware/auth");

router.post("/", auth, colorController.createColor);
router.get("/", auth, colorController.getAllColors);
router.get("/dropdown", auth, colorController.getColorDropdown);
router.put("/:id", auth, colorController.updateColor);
router.delete("/:id", auth, colorController.deleteColor);

module.exports = router;
