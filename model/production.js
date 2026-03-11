let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let ProductionSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'InquiryCategory'
    },
    model: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ModelSuggestion'
    },
    qty: {
      type: Number,
      required: true,
    },
    remarks: {
      type: String,
      default: "",
    },
    isEntryDone: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

let PRODUCTION = mongoose.model("Production", ProductionSchema);
module.exports = PRODUCTION;
