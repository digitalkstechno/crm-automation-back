const SourceFrom = require("../model/sourceFrom");

exports.createSourceFrom = async (req, res) => {
  try {
    const { name } = req.body;
    const sourceFrom = await SourceFrom.create({ name });
    res.status(201).json({ status: "Success", message: "Source From created successfully", data: sourceFrom });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

exports.getAllSourceFroms = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = { isDeleted: false };
    if (search) query.name = { $regex: search, $options: "i" };

    const sourceFroms = await SourceFrom.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await SourceFrom.countDocuments(query);

    res.json({
      status: "Success",
      message: "Source Froms fetched successfully",
      pagination: {
        totalRecords: count,
        currentPage: Number(page),
        totalPages: Math.ceil(count / limit),
        limit: Number(limit),
      },
      data: sourceFroms,
    });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

exports.getSourceFromsDropdown = async (req, res) => {
  try {
    const sourceFroms = await SourceFrom.find({ isDeleted: false }).select("_id name").sort({ name: 1 });
    res.json({ status: "Success", message: "Source Froms fetched successfully", data: sourceFroms });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

exports.updateSourceFrom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const sourceFrom = await SourceFrom.findByIdAndUpdate(id, { name }, { new: true });
    res.json({ status: "Success", message: "Source From updated successfully", data: sourceFrom });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

exports.deleteSourceFrom = async (req, res) => {
  try {
    const { id } = req.params;
    await SourceFrom.findByIdAndUpdate(id, { isDeleted: true });
    res.json({ status: "Success", message: "Source From deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};
