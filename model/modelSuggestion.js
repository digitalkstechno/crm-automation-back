let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let modelSuggestionSchema = new Schema(
  {
    modelNo: {
      type: String,
      required: true,
      unique: true,
    },
    color: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Color'
    },
    rate: {
      type: String,
      required: true,
    },
    gst: {
      type: Number,
      required: true,
      default: 18,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref : 'InquiryCategory'
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

let MODELSUGGESTION = mongoose.model("ModelSuggestion", modelSuggestionSchema);
module.exports = MODELSUGGESTION;
