const PRODUCTION = require("../model/production");
const { validatePositiveNumber, validateRequiredField } = require("../utils/validation");

exports.createProduction = async (req, res) => {
  try {
    const { date, category, model, qty, remarks } = req.body;

    // Validation
    if (!validateRequiredField(date)) {
      throw new Error("Date is required");
    }
    if (!validateRequiredField(category)) {
      throw new Error("Category is required");
    }
    if (!validateRequiredField(model)) {
      throw new Error("Model is required");
    }
    if (!validatePositiveNumber(qty) || parseFloat(qty) <= 0) {
      throw new Error("Quantity must be a positive number");
    }

    const production = await PRODUCTION.create({
      date,
      category,
      model,
      qty,
      remarks,
    });

    return res.status(201).json({
      status: "Success",
      message: "Production created successfully",
      data: production,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllProductions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    let matchQuery = {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      ],
    };

    const productions = await PRODUCTION.find(matchQuery)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("category")
      .populate({
        path: "model",
        populate: { path: "color" }
      });

    let filteredProductions = productions;

    if (search) {
      filteredProductions = productions.filter((prod) => {
        const categoryMatch = prod.category?.name?.toLowerCase().includes(search.toLowerCase());
        const modelMatch = prod.model?.modelNo?.toLowerCase().includes(search.toLowerCase());
        const colorMatch = prod.model?.color?.name?.toLowerCase().includes(search.toLowerCase());
        const qtyMatch = prod.qty?.toString().includes(search);
        const remarksMatch = prod.remarks?.toLowerCase().includes(search.toLowerCase());
        
        return categoryMatch || modelMatch || colorMatch || qtyMatch || remarksMatch;
      });
    }

    const totalProductions = search ? filteredProductions.length : await PRODUCTION.countDocuments(matchQuery);

    return res.status(200).json({
      status: "Success",
      message: "Productions fetched successfully",
      pagination: {
        totalRecords: totalProductions,
        currentPage: page,
        totalPages: Math.ceil(totalProductions / limit),
        limit,
      },
      data: filteredProductions,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchProductionById = async (req, res) => {
  try {
    const production = await PRODUCTION.findById(req.params.id)
      .populate("category")
      .populate({
        path: "model",
        populate: { path: "color" }
      });

    if (!production) {
      throw new Error("Production not found");
    }

    return res.status(200).json({
      status: "Success",
      message: "Production fetched successfully",
      data: production,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.updateProduction = async (req, res) => {
  try {
    const { qty } = req.body;
    
    // Validation
    if (qty && (!validatePositiveNumber(qty) || parseFloat(qty) <= 0)) {
      throw new Error("Quantity must be a positive number");
    }
    
    const production = await PRODUCTION.findById(req.params.id);
    if (!production) {
      throw new Error("Production not found");
    }

    const updatedProduction = await PRODUCTION.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("category").populate({
      path: "model",
      populate: { path: "color" }
    });

    return res.status(200).json({
      status: "Success",
      message: "Production updated successfully",
      data: updatedProduction,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.deleteProduction = async (req, res) => {
  try {
    const production = await PRODUCTION.findById(req.params.id);
    if (!production) {
      throw new Error("Production not found");
    }

    await PRODUCTION.findByIdAndUpdate(req.params.id, { isDeleted: true });

    return res.status(200).json({
      status: "Success",
      message: "Production deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.markEntryDone = async (req, res) => {
  try {
    const production = await PRODUCTION.findById(req.params.id);
    if (!production) {
      throw new Error("Production not found");
    }

    const updatedProduction = await PRODUCTION.findByIdAndUpdate(
      req.params.id,
      { isEntryDone: true },
      { new: true }
    ).populate("category").populate({
      path: "model",
      populate: { path: "color" }
    });

    return res.status(200).json({
      status: "Success",
      message: "Entry marked as done successfully",
      data: updatedProduction,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
