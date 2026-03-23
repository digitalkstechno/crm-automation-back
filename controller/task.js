const Task = require("../model/task");
const TaskStatus = require("../model/taskStatus");
const { deleteUploadedFile } = require("../utils/fileHelper");

exports.createTask = async (req, res) => {
  try {
    const { subject, description, startDate, endDate, taskStatus, legacyStatus, priority } = req.body;

    const parseIds = (val) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return Array.isArray(val) ? val : [val]; }
    };

    const attachments = (req.files || []).map((f) => ({
      originalName: f.originalname,
      filename: f.filename,
      path: `/images/TaskAttachments/${f.filename}`,
    }));

    const taskData = {
      subject,
      description,
      startDate,
      endDate,
      priority,
      assignedUsers: parseIds(req.body.assignedUsers),
      assignedTeams: parseIds(req.body.assignedTeams),
      attachments,
      createdBy: req.user?._id,
    };

    // Handle status - either new taskStatus reference or legacy status
    if (taskStatus) {
      taskData.taskStatus = taskStatus;
    } else if (legacyStatus) {
      taskData.legacyStatus = legacyStatus;
    }

    const task = await Task.create(taskData);

    return res.status(201).json({ status: "Success", message: "Task created successfully", data: task });
  } catch (error) {
    (req.files || []).forEach((f) => deleteUploadedFile("images/TaskAttachments", f.filename));
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = search ? { subject: { $regex: search, $options: "i" } } : {};
    // Handle both new taskStatus and legacy status
    if (req.query.status) {
      // Check if it's a valid ObjectId
      if (req.query.status.match(/^[0-9a-fA-F]{24}$/)) {
        query.taskStatus = req.query.status;
      } else {
        query.legacyStatus = req.query.status;
      }
    }
    if (req.query.priority) query.priority = req.query.priority;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .skip(skip).limit(limit).sort({ createdAt: -1 })
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName")
      .populate("taskStatus");

    return res.status(200).json({
      status: "Success",
      data: tasks,
      pagination: { totalRecords: total, currentPage: page, totalPages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName")
      .populate("taskStatus");
    if (!task) throw new Error("Task not found");
    return res.status(200).json({ status: "Success", data: task });
  } catch (error) {
    return res.status(404).json({ status: "Fail", message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new Error("Task not found");

    const parseIds = (val) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return Array.isArray(val) ? val : [val]; }
    };

    const updateData = { ...req.body };
    if (req.body.assignedUsers !== undefined) updateData.assignedUsers = parseIds(req.body.assignedUsers);
    if (req.body.assignedTeams !== undefined) updateData.assignedTeams = parseIds(req.body.assignedTeams);

    // Handle status - either new taskStatus reference or legacy status
    if (req.body.taskStatus !== undefined) {
      updateData.taskStatus = req.body.taskStatus;
      updateData.legacyStatus = null;
    } else if (req.body.legacyStatus !== undefined) {
      updateData.legacyStatus = req.body.legacyStatus;
      updateData.taskStatus = null;
    }

    if (req.files?.length) {
      const newAttachments = req.files.map((f) => ({
        originalName: f.originalname,
        filename: f.filename,
        path: `/images/TaskAttachments/${f.filename}`,
      }));
      updateData.attachments = [...(task.attachments || []), ...newAttachments];
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
    return res.status(200).json({ status: "Success", message: "Task updated successfully", data: updated });
  } catch (error) {
    (req.files || []).forEach((f) => deleteUploadedFile("images/TaskAttachments", f.filename));
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = { assignedUsers: req.user._id };
    if (search) query.subject = { $regex: search, $options: "i" };
    // Handle both new taskStatus and legacy status
    if (req.query.status) {
      if (req.query.status.match(/^[0-9a-fA-F]{24}$/)) {
        query.taskStatus = req.query.status;
      } else {
        query.legacyStatus = req.query.status;
      }
    }
    if (req.query.priority) query.priority = req.query.priority;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .skip(skip).limit(limit).sort({ createdAt: -1 })
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName")
      .populate("taskStatus");

    return res.status(200).json({
      status: "Success",
      data: tasks,
      pagination: { totalRecords: total, currentPage: page, totalPages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status, legacyStatus } = req.body;
    const updateData = {};

    // Handle both new taskStatus (ObjectId) and legacy status (string)
    if (status) {
      if (status.match(/^[0-9a-fA-F]{24}$/)) {
        updateData.taskStatus = status;
        updateData.legacyStatus = null;
      } else {
        updateData.legacyStatus = status;
        updateData.taskStatus = null;
      }
    } else if (legacyStatus) {
      updateData.legacyStatus = legacyStatus;
      updateData.taskStatus = null;
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("taskStatus");

    if (!task) throw new Error("Task not found");
    return res.status(200).json({ status: "Success", data: task });
  } catch (error) {
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.updateTaskPriority = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { priority: req.body.priority },
      { new: true }
    );
    if (!task) throw new Error("Task not found");
    return res.status(200).json({ status: "Success", data: task });
  } catch (error) {
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.getTaskSummary = async (req, res) => {
  try {
    // Get all task statuses
    const taskStatuses = await TaskStatus.find().sort({ order: 1 });

    // Build status query for each status
    const statusCounts = {};
    let total = 0;
    let legacyCounts = { todo: 0, in_progress: 0, completed: 0, cancelled: 0 };

    for (const status of taskStatuses) {
      const count = await Task.countDocuments({ taskStatus: status._id });
      statusCounts[status._id.toString()] = count;
      statusCounts[status.name] = count;
      total += count;
    }

    // Also count legacy statuses
    for (const status of ['todo', 'in_progress', 'completed', 'cancelled']) {
      const count = await Task.countDocuments({ legacyStatus: status });
      legacyCounts[status] = count;
      total += count;
    }

    const [low, medium, high] = await Promise.all([
      Task.countDocuments({ priority: 'low' }),
      Task.countDocuments({ priority: 'medium' }),
      Task.countDocuments({ priority: 'high' }),
    ]);

    return res.status(200).json({
      status: 'Success',
      data: {
        total,
        statusCounts,
        legacyCounts,
        taskStatuses: taskStatuses,
        low, medium, high
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'Fail', message: error.message });
  }
};

exports.getMyTaskSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    // Get all task statuses
    const taskStatuses = await TaskStatus.find().sort({ order: 1 });

    const statusCounts = {};
    let total = 0;

    for (const status of taskStatuses) {
      const count = await Task.countDocuments({ assignedUsers: userId, taskStatus: status._id });
      statusCounts[status._id.toString()] = count;
      statusCounts[status.name] = count;
      total += count;
    }

    // Legacy status counts
    const legacyStatuses = ['todo', 'in_progress', 'completed', 'cancelled'];
    const legacyCounts = {};
    for (const status of legacyStatuses) {
      const count = await Task.countDocuments({ assignedUsers: userId, legacyStatus: status });
      legacyCounts[status] = count;
      total += count;
    }

    return res.status(200).json({
      status: 'Success',
      data: { total, statusCounts, legacyCounts, taskStatuses },
    });
  } catch (error) {
    return res.status(500).json({ status: 'Fail', message: error.message });
  }
};

// Get all tasks grouped by status for kanban view
exports.getTasksForKanban = async (req, res) => {
  try {
    const search = req.query.search || "";
    const myTasksOnly = req.query.my === 'true';

    // Get all task statuses
    const taskStatuses = await TaskStatus.find().sort({ order: 1 });

    // Build base query
    const baseQuery = {};
    if (search) {
      baseQuery.subject = { $regex: search, $options: "i" };
    }
    if (myTasksOnly) {
      baseQuery.assignedUsers = req.user._id;
    }

    // Get all tasks with their statuses
    const allTasks = await Task.find(baseQuery)
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName")
      .populate("taskStatus")
      .sort({ createdAt: -1 });

    // Group tasks by status
    const tasksByStatus = {};

    // Initialize with all statuses
    for (const status of taskStatuses) {
      tasksByStatus[status._id.toString()] = {
        _id: status._id,
        name: status.name,
        color: status.color,
        order: status.order,
        tasks: []
      };
    }

    // Add legacy status groups
    const legacyStatusGroups = ['todo', 'in_progress', 'completed', 'cancelled'];
    for (const status of legacyStatusGroups) {
      tasksByStatus[status] = {
        _id: status,
        name: status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1),
        color: status === 'todo' ? '#6B7280' : status === 'in_progress' ? '#3B82F6' : status === 'completed' ? '#10B981' : '#EF4444',
        order: 99,
        tasks: []
      };
    }

    // Distribute tasks into their status groups
    for (const task of allTasks) {
      let statusKey;
      if (task.taskStatus) {
        statusKey = task.taskStatus._id.toString();
      } else if (task.legacyStatus) {
        statusKey = task.legacyStatus;
      } else {
        // Default to first status if no status set
        statusKey = taskStatuses.length > 0 ? taskStatuses[0]._id.toString() : 'todo';
      }

      if (tasksByStatus[statusKey]) {
        tasksByStatus[statusKey].tasks.push(task);
      }
    }

    // Convert to array and sort by order
    const groupedTasks = Object.values(tasksByStatus)
      .sort((a, b) => a.order - b.order);

    return res.status(200).json({
      status: 'Success',
      data: {
        statuses: taskStatuses,
        tasksByStatus: groupedTasks
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'Fail', message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new Error("Task not found");
    (task.attachments || []).forEach((a) => deleteUploadedFile("images/TaskAttachments", a.filename));
    await Task.findByIdAndDelete(req.params.id);
    return res.status(200).json({ status: "Success", message: "Task deleted successfully" });
  } catch (error) {
    return res.status(404).json({ status: "Fail", message: error.message });
  }
};
exports.deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ status: "Fail", message: "Task not found" });
    }

    // Find the attachment
    const attachmentIndex = task.attachments.findIndex(
      (att) => att._id?.toString() === attachmentId || att.path === attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ status: "Fail", message: "Attachment not found" });
    }

    const attachment = task.attachments[attachmentIndex];

    // Delete file from filesystem
    if (attachment.filename) {
      deleteUploadedFile("images/TaskAttachments", attachment.filename);
    }

    // Remove from DB via splice
    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    return res.status(200).json({
      status: "Success",
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};
