let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let LeadStatusSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    order: {
      type: Number,
      unique: true,
      sparse: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

let LEADSTATUS = mongoose.model("leadStatus", LeadStatusSchema);
module.exports = LEADSTATUS;
