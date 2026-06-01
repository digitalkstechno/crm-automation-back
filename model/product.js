const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
