let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let colorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

let COLOR = mongoose.model("Color", colorSchema);
module.exports = COLOR;
