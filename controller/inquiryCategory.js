const INQUIRYCATEGORY = require("../model/inquiryCategory");

exports.createinquiryCategory = async (req, res) => {
  try {
    const { name } = req.body;
    let verify = await INQUIRYCATEGORY.findOne({ name });
    
    // If exists and is deleted, reactivate it
    if (verify && verify.isDeleted) {
      const reactivated = await INQUIRYCATEGORY.findByIdAndUpdate(
        verify._id,
        { isDeleted: false },
        { new: true }
      );
      return res.status(201).json({
        status: "Success",
        message: "Inquiry Category reactivated successfully",
        data: reactivated,
      });
    }
    
    if (verify) throw new Error("Inquiry Category already exists");

    const inquiryDetails = await INQUIRYCATEGORY.create({ name });

    return res.status(201).json({
      status: "Success",
      message: "Inquiry Category created successfully",
      data: inquiryDetails,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllinquiryCategoryies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const query = {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        { $or: [{ name: { $regex: search, $options: "i" } }] },
      ],
    };

    const totalInquire = await INQUIRYCATEGORY.countDocuments(query);
    const inquireData = await INQUIRYCATEGORY.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "Success",
      message: "inquire category Data fetched successfully",
      pagination: {
        totalRecords: totalInquire,
        currentPage: page,
        totalPages: Math.ceil(totalInquire / limit),
        limit,
      },
      data: inquireData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllinquiryCategoryiesForDropdown = async (req, res) => {
  try {
    const query = {
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    };

    const inquireData = await INQUIRYCATEGORY.find(query)
      .select('_id name')
      .sort({ name: 1 });

    return res.status(200).json({
      status: "Success",
      message: "inquire category Data fetched successfully",
      data: inquireData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchinquiryCategoryById = async (req, res) => {
  try {
    let inquiryID = req.params.id;
    let inquiryData = await INQUIRYCATEGORY.findById(inquiryID);
    if (!inquiryData) {
      throw new Error("inquiry Category not found");
    }
    return res.status(200).json({
      status: "Success",
      message: "inquiry Category data fetched successfully",
      data: inquiryData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.inquiryCategoryUpdate = async (req, res) => {
  try {
    let inquiryId = req.params.id;
    let oldInquiry = await INQUIRYCATEGORY.findById(inquiryId);

    if (!oldInquiry) {
      throw new Error("inquiry Category not found");
    }

    let updatedCategory = await INQUIRYCATEGORY.findByIdAndUpdate(
      inquiryId,
      req.body,
      {
        new: true,
      },
    );
    return res.status(200).json({
      status: "Success",
      message: "inquiry Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.inquiryCategoryDelete = async (req, res) => {
  try {
    let inquiryId = req.params.id;
    let oldInquiry = await INQUIRYCATEGORY.findById(inquiryId);

    if (!oldInquiry) {
      throw new Error("inquiry Category not found");
    }

    await INQUIRYCATEGORY.findByIdAndUpdate(inquiryId, { isDeleted: true });

    return res.status(200).json({
      status: "Success",
      message: "inquiry Category deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
