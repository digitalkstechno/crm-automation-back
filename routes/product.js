const express = require("express");
const router = express.Router();
const productController = require("../controller/product");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, productController.getProducts);
router.post("/", authMiddleware, productController.createProduct);
router.put("/:id", authMiddleware, productController.updateProduct);
router.delete("/:id", authMiddleware, productController.deleteProduct);

module.exports = router;
