const MODELSUGGESTION = require("../model/modelSuggestion");

exports.createmodelSuggestion = async (req, res) => {
  try {
    const { modelNo, color, rate, gst, category } = req.body;
    let verify = await MODELSUGGESTION.findOne({ modelNo, color, category });
    
    if (verify && verify.isDeleted) {
      const reactivated = await MODELSUGGESTION.findByIdAndUpdate(
        verify._id,
        { modelNo, color, rate, gst, category, isDeleted: false },
        { new: true }
      );
      return res.status(201).json({
        status: "Success",
        message: "Model Suggestion reactivated successfully",
        data: reactivated,
      });
    }
    
    if (verify) throw new Error("Model Suggestion already exists");

    const Details = await MODELSUGGESTION.create({
      modelNo,
      color,
      rate,
      gst,
      category,
    });

    return res.status(201).json({
      status: "Success",
      message: "Model Suggestion created successfully",
      data: Details,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllModelSuggestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const query = {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { modelNo: { $regex: search, $options: "i" } },
            { rate: { $regex: search, $options: "i" } },
          ],
        },
      ],
    };

    const totalModel = await MODELSUGGESTION.countDocuments(query);
    const modelSuggestionData = await MODELSUGGESTION.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("category")
      .populate("color");

    return res.status(200).json({
      status: "Success",
      message: "Model Suggestion Data fetched successfully",
      pagination: {
        totalRecords: totalModel,
        currentPage: page,
        totalPages: Math.ceil(totalModel / limit),
        limit,
      },
      data: modelSuggestionData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchModelsByCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const models = await MODELSUGGESTION.find({ 
      category: categoryId, 
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
    }).populate('category').populate('color');
    
    return res.status(200).json({
      status: "Success",
      message: "Models fetched successfully",
      data: models,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchmodelSuggestionById = async (req, res) => {
  try {
    let modelID = req.params.id;
    let modelData = await MODELSUGGESTION.findById(modelID).populate('category').populate('color');
    if (!modelData) {
      throw new Error("Model Suggestion data not found");
    }
    return res.status(200).json({
      status: "Success",
      message: "Model Suggestion data fetched successfully",
      data: modelData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.ModelSuggestionUpdate = async (req, res) => {
  try {
    let modelId = req.params.id;
    let oldModel = await MODELSUGGESTION.findById(modelId);

    if (!oldModel) {
      throw new Error("Model Suggestion not found");
    }

    let updatedModel = await MODELSUGGESTION.findByIdAndUpdate(
      modelId,
      req.body,
      {
        new: true,
      },
    );
    return res.status(200).json({
      status: "Success",
      message: "Model Suggestion updated successfully",
      data: updatedModel,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.ModelSuggestionDelete = async (req, res) => {
  try {
    let modelId = req.params.id;
    let oldModel = await MODELSUGGESTION.findById(modelId);

    if (!oldModel) {
      throw new Error("model suggestion not found");
    }

    await MODELSUGGESTION.findByIdAndUpdate(modelId, { isDeleted: true });

    return res.status(200).json({
      status: "Success",
      message: "Model Suggestion deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
