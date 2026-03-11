let mongoose = require("mongoose");
let Schema = mongoose.Schema;
const { LEAD_STATUSES } = require("../constants/leadStatus");

/* -------------------- ITEM SCHEMA -------------------- */

let itemSchema = new Schema(
  {
    inquiryCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InquiryCategory",
      required: true,
    },
    modelSuggestion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModelSuggestion",
    },
    qty: { type: String },
    rate: { type: String },
    gst: { type: String },
    total: { type: String },
    isDone: { type: Boolean, default: false },
    customizationType: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomizationType",
    }],
    customizationDescription: String,
    personalization: {
      isPersonalized: {
        type: Boolean,
        default: false,
      },
      location: String,
      description: String,
    },
  },
  { _id: true }
);

let remarkSchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    remark: { type: String }
  }
)

let paymentSchema = new Schema({
  date: { type: Date, default: Date.now },
  amount: { type: String },
  modeOfPayment: {
    type: String,
    enum: ["Cash", "Cheque", "NEFT", "RTGS", "DD"]
  },
  remark: { type: String }
})

let followUpSchema = new Schema({
  date: { type: Date, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

/* -------------------- LEAD SCHEMA -------------------- */

let leadSchema = new Schema(
  {
    leadDate: {
      type: Date,
      default: Date.now,
    },

    clientType: {
      type: String,
      enum: ["New", "Existing"],
    },

    deliveryDate: {
      type: Date,
    },

    shippingCharges: {
      type: String,
    },

    budget: {
      from: { type: String },
      to: { type: String },
    },

    accountMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountMaster",
    },

    leadStatus: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New Lead",
    },

    items: [itemSchema],
    remarks: [remarkSchema],
    paymentHistory: [paymentSchema],
    followUps: [followUpSchema],
    totalAmount: { type: String },
    confirmationRemark: { type: String },
    maxStatusReached: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New Lead",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

let LEAD = mongoose.model("Lead", leadSchema);
module.exports = LEAD;
