const Task = require("../model/task");
const { deleteUploadedFile } = require("../utils/fileHelper");

exports.createTask = async (req, res) => {
  try {
    const { subject, description, startDate, endDate, status, priority } = req.body;

    const parseIds = (val) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return Array.isArray(val) ? val : [val]; }
    };

    const attachments = (req.files || []).map((f) => ({
      originalName: f.originalname,
      filename: f.filename,
      path: `/images/TaskAttachments/${f.filename}`,
    }));

    const task = await Task.create({
      subject,
      description,
      startDate,
      endDate,
      status,
      priority,
      assignedUsers: parseIds(req.body.assignedUsers),
      assignedTeams: parseIds(req.body.assignedTeams),
      attachments,
      createdBy: req.user?._id,
    });

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
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .skip(skip).limit(limit).sort({ createdAt: -1 })
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName");

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
      .populate("createdBy", "fullName");
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
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .skip(skip).limit(limit).sort({ createdAt: -1 })
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName");

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
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
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
    const [total, todo, inProgress, completed, cancelled, low, medium, high] = await Promise.all([
      Task.countDocuments({}),
      Task.countDocuments({ status: 'todo' }),
      Task.countDocuments({ status: 'in_progress' }),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'cancelled' }),
      Task.countDocuments({ priority: 'low' }),
      Task.countDocuments({ priority: 'medium' }),
      Task.countDocuments({ priority: 'high' }),
    ]);
    return res.status(200).json({
      status: 'Success',
      data: { total, todo, inProgress, completed, cancelled, low, medium, high },
    });
  } catch (error) {
    return res.status(500).json({ status: 'Fail', message: error.message });
  }
};

exports.getMyTaskSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, todo, inProgress, completed, cancelled] = await Promise.all([
      Task.countDocuments({ assignedUsers: userId }),
      Task.countDocuments({ assignedUsers: userId, status: 'todo' }),
      Task.countDocuments({ assignedUsers: userId, status: 'in_progress' }),
      Task.countDocuments({ assignedUsers: userId, status: 'completed' }),
      Task.countDocuments({ assignedUsers: userId, status: 'cancelled' }),
    ]);
    return res.status(200).json({
      status: 'Success',
      data: { total, todo, inProgress, completed, cancelled },
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
