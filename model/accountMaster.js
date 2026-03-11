let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let accountMasterSchema = new Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
    },
    address: {
      line1: String,
      line2: String,
      cityName: String,
      stateName: String,
      countryName: String,
    },
    mobile: {
      type: String,
    },
    email: {
      type: String,
    },
    website: {
      type: String,
    },
    sourcebyTypeOfClient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientType",
    },
    sourceFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SourceFrom",
    },
    assignBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    remark: {
      type: String,
    },
    isConverted: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

let ACCOUNTMASTER = mongoose.model("AccountMaster", accountMasterSchema);
module.exports = ACCOUNTMASTER;
