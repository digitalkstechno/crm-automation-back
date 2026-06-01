const Product = require("../model/product");

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.status(200).json({ status: "Success", data: products });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    return res.status(201).json({ status: "Success", data: product });
  } catch (error) {
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ status: "Fail", message: "Product not found" });
    return res.status(200).json({ status: "Success", data: product });
  } catch (error) {
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ status: "Fail", message: "Product not found" });
    return res.status(200).json({ status: "Success", message: "Product deleted" });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};
