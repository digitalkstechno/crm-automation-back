const CUSTOMIZATIONTYPE = require("../model/customizationType");

exports.createCustomizationType = async (req, res) => {
  try {
    const { name } = req.body;
    let verify = await CUSTOMIZATIONTYPE.findOne({ name });
    
    // If exists and is deleted, reactivate it
    if (verify && verify.isDeleted) {
      const reactivated = await CUSTOMIZATIONTYPE.findByIdAndUpdate(
        verify._id,
        { isDeleted: false },
        { new: true }
      );
      return res.status(201).json({
        status: "Success",
        message: "Customization Type reactivated successfully",
        data: reactivated,
      });
    }
    
    if (verify) throw new Error("Customization Type already exists");

    const customizationType = await CUSTOMIZATIONTYPE.create({ name });

    return res.status(201).json({
      status: "Success",
      message: "Customization Type created successfully",
      data: customizationType,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllCustomizationTypes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = search 
      ? { name: { $regex: search, $options: "i" }, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] } 
      : { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] };

    const totalRecords = await CUSTOMIZATIONTYPE.countDocuments(query);
    const customizationTypes = await CUSTOMIZATIONTYPE.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "Success",
      message: "Customization Types fetched successfully",
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        limit,
      },
      data: customizationTypes,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllCustomizationTypesForDropdown = async (req, res) => {
  try {
    const query = { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] };
    const customizationTypes = await CUSTOMIZATIONTYPE.find(query)
      .select('_id name')
      .sort({ name: 1 });

    return res.status(200).json({
      status: "Success",
      message: "Customization Types fetched successfully",
      data: customizationTypes,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchCustomizationTypeById = async (req, res) => {
  try {
    const id = req.params.id;
    const customizationType = await CUSTOMIZATIONTYPE.findById(id);
    if (!customizationType) throw new Error("Customization Type not found");

    return res.status(200).json({
      status: "Success",
      message: "Customization Type fetched successfully",
      data: customizationType,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.updateCustomizationType = async (req, res) => {
  try {
    const id = req.params.id;
    const oldCustomizationType = await CUSTOMIZATIONTYPE.findById(id);
    if (!oldCustomizationType) throw new Error("Customization Type not found");

    const updatedCustomizationType = await CUSTOMIZATIONTYPE.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    return res.status(200).json({
      status: "Success",
      message: "Customization Type updated successfully",
      data: updatedCustomizationType,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.deleteCustomizationType = async (req, res) => {
  try {
    const id = req.params.id;
    const customizationType = await CUSTOMIZATIONTYPE.findById(id);
    if (!customizationType) throw new Error("Customization Type not found");

    await CUSTOMIZATIONTYPE.findByIdAndUpdate(id, { isDeleted: true });

    return res.status(200).json({
      status: "Success",
      message: "Customization Type deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
