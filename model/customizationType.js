let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let customizationTypeSchema = new Schema(
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

let CUSTOMIZATIONTYPE = mongoose.model("CustomizationType", customizationTypeSchema);
module.exports = CUSTOMIZATIONTYPE;
