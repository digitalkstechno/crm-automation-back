const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["todo", "in_progress", "completed", "cancelled"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Staff" }],
    assignedTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
    attachments: [
      {
        originalName: String,
        filename: String,
        path: String,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
