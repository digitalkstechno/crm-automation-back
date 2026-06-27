const TASKSTATUS = require("../model/taskStatus");

exports.createTaskStatus = async (req, res) => {
    try {
        let taskStatusCreate = req.body;
        if (taskStatusCreate.order === undefined || taskStatusCreate.order === null || taskStatusCreate.order === "") {
            const maxItem = await TASKSTATUS.findOne().sort({ order: -1 });
            taskStatusCreate.order = maxItem && maxItem.order != null ? maxItem.order + 1 : 1;
        }
        let newTaskStatus = await TASKSTATUS.create(taskStatusCreate);
        res.status(201).json({
            status: "Success",
            data: newTaskStatus,
        });
    } catch (error) {
        res.status(400).json({
            status: "Fail",
            message: error.message,
        });
    }
};

exports.fetchAllTaskStatus = async (req, res) => {
    try {
        const search = req.query.search || "";

        const query = {
            $or: [{ name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: "i" } }],
        };

        // check if pagination params exist
        const hasPagination = req.query.page || req.query.limit;

        if (hasPagination) {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const totalStatus = await TASKSTATUS.countDocuments(query);

            const StatusData = await TASKSTATUS.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ order: 1, createdAt: -1 });

            return res.status(200).json({
                status: "Success",
                message: "Tasks Status fetched successfully",
                pagination: {
                    totalRecords: totalStatus,
                    currentPage: page,
                    totalPages: Math.ceil(totalStatus / limit),
                    limit,
                },
                data: StatusData,
            });
        } else {
            // 👉 No pagination → return all data
            const StatusData = await TASKSTATUS.find(query).sort({ order: 1, createdAt: -1 });

            return res.status(200).json({
                status: "Success",
                message: "All Tasks Status fetched successfully",
                data: StatusData,
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: "Fail",
            message: error.message,
        });
    }
};

exports.fetchTaskStatusById = async (req, res) => {
    try {
        let StatusId = req.params.id;
        let StatusData = await TASKSTATUS.findById(StatusId);
        if (!StatusData) {
            throw new Error("Task Status not found");
        }
        return res.status(200).json({
            status: "Success",
            message: "Task Status fetched successfully",
            data: StatusData,
        });
    } catch (error) {
        return res.status(400).json({
            status: "Fail",
            message: error.message,
        });
    }
};

exports.TaskStatusUpdate = async (req, res) => {
    try {
        let StatusId = req.params.id;
        let oldTaskStatus = await TASKSTATUS.findById(StatusId);
        if (!oldTaskStatus) {
            throw new Error("Task Status not found");
        }
        let updatedStatus = await TASKSTATUS.findByIdAndUpdate(StatusId, req.body, {
            new: true,
        });
        return res.status(200).json({
            status: "Success",
            message: "Task Status updated successfully",
            data: updatedStatus,
        });
    } catch (error) {
        return res.status(400).json({
            status: "Fail",
            message: error.message,
        });
    }
};

exports.TaskStatusDelete = async (req, res) => {
    try {
        let StatusId = req.params.id;
        let oldTaskStatus = await TASKSTATUS.findById(StatusId);

        if (!oldTaskStatus) {
            throw new Error("Task Status not found");
        }
        await TASKSTATUS.findByIdAndDelete(StatusId);

        return res.status(200).json({
            status: "Success",
            message: "Task Status deleted successfully",
        });
    } catch (error) {
        return res.status(400).json({
            status: "Fail",
            message: error.message,
        });
    }
};

exports.setupDefaultTaskStatuses = async () => {
    try {
        const defaultStatuses = [
            { name: "To Do", order: 1, color: "#6B7280" },
            { name: "In Progress", order: 2, color: "#3B82F6" },
            { name: "Completed", order: 3, color: "#10B981" },
            { name: "Cancelled", order: 4, color: "#EF4444" },
        ];

        for (const status of defaultStatuses) {
            const existingStatus = await TASKSTATUS.findOne({ name: status.name });
            if (!existingStatus) {
                await TASKSTATUS.create(status);
            }
        }
    } catch (error) {
        console.error("Error setting up default task statuses:", error);
    }
};


exports.bulkReorder = async (req, res) => {
    try {
        const { items } = req.body; // [{ _id, order }]
        if (!Array.isArray(items)) {
            return res.status(400).json({ status: "Fail", message: "Invalid payload format" });
        }
        
        // Step 1: Assign temporary negative orders to avoid unique constraint violations
        const bulkOps1 = items.map(item => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: { order: -item.order - 1000000 } }
            }
        }));
        await TASKSTATUS.bulkWrite(bulkOps1);

        // Step 2: Assign final actual orders
        const bulkOps2 = items.map(item => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: { order: item.order } }
            }
        }));
        await TASKSTATUS.bulkWrite(bulkOps2);

        res.status(200).json({ status: "Success", message: "Reordered successfully" });
    } catch (error) {
        res.status(400).json({ status: "Fail", message: error.message });
    }
};
