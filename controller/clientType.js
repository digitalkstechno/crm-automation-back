const ClientType = require("../model/clientType");

exports.createClientType = async (req, res) => {
  try {
    const { name, isHighlight } = req.body;
    const clientType = await ClientType.create({ name, isHighlight: isHighlight || false });
    res.status(201).json({ status: "Success", message: "Client Type created successfully", data: clientType });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

exports.getAllClientTypes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = { isDeleted: false };
    if (search) query.name = { $regex: search, $options: "i" };

    const clientTypes = await ClientType.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await ClientType.countDocuments(query);

    res.json({
      status: "Success",
      message: "Client Types fetched successfully",
      pagination: {
        totalRecords: count,
        currentPage: Number(page),
        totalPages: Math.ceil(count / limit),
        limit: Number(limit),
      },
      data: clientTypes,
    });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

exports.getClientTypesDropdown = async (req, res) => {
  try {
    const clientTypes = await ClientType.find({ isDeleted: false }).select("_id name isHighlight").sort({ name: 1 });
    res.json({ status: "Success", message: "Client Types fetched successfully", data: clientTypes });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

exports.updateClientType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isHighlight } = req.body;
    const clientType = await ClientType.findByIdAndUpdate(id, { name, isHighlight }, { new: true });
    res.json({ status: "Success", message: "Client Type updated successfully", data: clientType });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

exports.deleteClientType = async (req, res) => {
  try {
    const { id } = req.params;
    await ClientType.findByIdAndUpdate(id, { isDeleted: true });
    res.json({ status: "Success", message: "Client Type deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};
