const COLOR = require("../model/color");

exports.createColor = async (req, res) => {
  try {
    const { name } = req.body;
    
    const existingColor = await COLOR.findOne({ name, isDeleted: false });
    if (existingColor) {
      return res.status(400).json({ message: "Color already exists" });
    }

    const color = new COLOR({ name });
    await color.save();
    
    res.status(201).json({ message: "Color created successfully", data: color });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllColors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const colors = await COLOR.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await COLOR.countDocuments(query);

    res.status(200).json({
      data: colors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getColorDropdown = async (req, res) => {
  try {
    const colors = await COLOR.find({ isDeleted: false }).sort({ name: 1 });
    res.status(200).json({ data: colors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateColor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const existingColor = await COLOR.findOne({ name, isDeleted: false, _id: { $ne: id } });
    if (existingColor) {
      return res.status(400).json({ message: "Color already exists" });
    }

    const color = await COLOR.findByIdAndUpdate(id, { name }, { new: true });
    if (!color) {
      return res.status(404).json({ message: "Color not found" });
    }

    res.status(200).json({ message: "Color updated successfully", data: color });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteColor = async (req, res) => {
  try {
    const { id } = req.params;

    const color = await COLOR.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!color) {
      return res.status(404).json({ message: "Color not found" });
    }

    res.status(200).json({ message: "Color deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
