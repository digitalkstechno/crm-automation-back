const LeadPriority = require("../model/leadPriority");

exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = search ? { name: { $regex: search, $options: "i" } } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      LeadPriority.find(query).sort({ order: 1 }).skip(skip).limit(parseInt(limit)),
      LeadPriority.countDocuments(query),
    ]);

    return res.status(200).json({
      status: "Success",
      data,
      pagination: { totalRecords: total, currentPage: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, order } = req.body;
    const item = await LeadPriority.create({ name: name.trim(), order });
    return res.status(201).json({ status: "Success", data: item });
  } catch (error) {
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await LeadPriority.findById(req.params.id);
    if (!item) throw new Error("Not found");
    return res.status(200).json({ status: "Success", data: item });
  } catch (error) {
    return res.status(404).json({ status: "Fail", message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, order } = req.body;
    const item = await LeadPriority.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), order },
      { new: true }
    );
    if (!item) throw new Error("Not found");
    return res.status(200).json({ status: "Success", data: item });
  } catch (error) {
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await LeadPriority.findByIdAndDelete(req.params.id);
    if (!item) throw new Error("Not found");
    return res.status(200).json({ status: "Success", message: "Deleted successfully" });
  } catch (error) {
    return res.status(404).json({ status: "Fail", message: error.message });
  }
};
