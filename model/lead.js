const mongoose = require("mongoose");

const { Schema } = mongoose;

const LeadSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    contact: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    companyName: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    leadStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "leadStatus",
      required: true,
    },

    leadSource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "leadSource",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
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
    attachments: [
      {
        type: String,
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
    }
  },
  {
    timestamps: true,
  },
);

const LEAD = mongoose.model("Lead", LeadSchema);
module.exports = LEAD;
