let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let inquiryCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Inquiry Category Name is Required"],
      unique: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

let INQUIRYCATEGORY = mongoose.model("InquiryCategory", inquiryCategorySchema);
module.exports = INQUIRYCATEGORY;
