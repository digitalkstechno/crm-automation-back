const mongoose = require("mongoose");

const { Schema } = mongoose;

const LeadSchema = new Schema(
  {
    fullName: {
      type: String,
    },

    contact: {
      type: String,
    },

    email: {
      type: String,
      lowercase: true,
    },

    companyName: {
      type: String,
    },

    address: {
      type: String,
    },

    leadStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "leadStatus",
    },

    leadSource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "leadSource",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    priority: {
      type: mongoose.Schema.Types.Mixed,
    },

    nextFollowupDate: {
      type: Date,
      default: Date.now,
    },

    nextFollowupTime: {
      type: String,
    },

    note: {
      type: String,
      trim: true,
    },
    followUps: [
      {
        date: { type: Date },
        time: { type: String },
        note: { type: String, trim: true },
        staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        originalName: String,
        filename: String,
        path: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    metaLeadId: {
      type: String,
      unique: true,
      sparse: true
    },
    metaRawData: {
      type: Object
    },
    paymentAmount: {
      type: Number,
      default: 0,
    },
    amountBudget: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const LEAD = mongoose.model("Lead", LeadSchema);
module.exports = LEAD;
