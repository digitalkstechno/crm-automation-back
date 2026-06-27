const mongoose = require("mongoose");

const { Schema } = mongoose;

const LeadSchema = new Schema(
  {
    fullName: {
      type: String,
    },

    countryCode: {
      type: String,
      default: "+91",
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
    leadLabel: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "leadLabel",
    }],

    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
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
    isWon: {
      type: Boolean,
      default: false,
    },
    wonDate: {
      type: Date,
    },
    isLost: {
      type: Boolean,
      default: false,
    },
    lostDate: {
      type: Date,
    },
    lostReason: {
      type: String,
    },
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }],
  },
  {
    timestamps: true,
  },
);

const LEAD = mongoose.model("Lead", LeadSchema);
module.exports = LEAD;
