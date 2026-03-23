const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startDate: { type: Date },
    endDate: { type: Date },
    taskStatus: { type: mongoose.Schema.Types.ObjectId, ref: "taskStatus" },
    legacyStatus: {
      type: String,
      enum: ["todo", "in_progress", "completed", "cancelled"],
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

// Virtual for getting current status value (handles both new and legacy)
TaskSchema.virtual('status').get(function () {
  if (this.taskStatus) {
    return this.taskStatus;
  }
  return this.legacyStatus;
});

// Set virtuals to appear in JSON
TaskSchema.set('toJSON', { virtuals: true });
TaskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Task", TaskSchema);
