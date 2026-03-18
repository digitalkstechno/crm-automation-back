const LEADSTATUS = require("../model/leadStatus");

const syncLeadStatusOrders = async () => {
  const all = await LEADSTATUS.find().sort({ order: 1, createdAt: 1 });
  
  const newLead = all.find(s => s.name && s.name.toLowerCase() === "new lead");
  const won = all.find(s => s.name && s.name.toLowerCase() === "won");
  const lost = all.find(s => s.name && s.name.toLowerCase() === "lost");
  
  const defaultNames = ["new lead", "won", "lost"];
  const others = all.filter(s => !(s.name && defaultNames.includes(s.name.toLowerCase())));
  
  others.sort((a, b) => a.order - b.order);
  
  let ordered = [];
  if (newLead) ordered.push(newLead);
  ordered.push(...others);
  if (won) ordered.push(won);
  if (lost) ordered.push(lost);
  
  for (let i = 0; i < ordered.length; i++) {
    const targetOrder = i + 1;
    if (ordered[i].order !== targetOrder) {
      await LEADSTATUS.findByIdAndUpdate(ordered[i]._id, { order: targetOrder });
    }
  }
};

exports.setupDefaultLeadStatuses = async () => {
  const defaults = ["New Lead", "Won", "Lost"];
  for (const name of defaults) {
    const exists = await LEADSTATUS.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (!exists) {
      await LEADSTATUS.create({ name, order: 999999 });
    }
  }
  await syncLeadStatusOrders();
};

exports.createLeadStatus = async (req, res) => {
  try {
    let leadStatusCreate = req.body;
    if (leadStatusCreate.name && ["new lead", "won", "lost"].includes(leadStatusCreate.name.toLowerCase())) {
      throw new Error("Cannot manually create default statuses.");
    }
    let newLeadStatus = await LEADSTATUS.create(leadStatusCreate);
    await syncLeadStatusOrders();
    newLeadStatus = await LEADSTATUS.findById(newLeadStatus._id);
    res.status(201).json({
      status: "Success",
      data: newLeadStatus,
    });
  } catch (error) {
    res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllLeadStatus = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const query = {
      $or: [{ name: { $regex: search, $options: "i" } }],
    };

    const totalStatus = await LEADSTATUS.countDocuments(query);
    const StatusData = await LEADSTATUS.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ order: 1 });

    return res.status(200).json({
      status: "Success",
      message: "Leads Status fetched successfully",
      pagination: {
        totalRecords: totalStatus,
        currentPage: page,
        totalPages: Math.ceil(totalStatus / limit),
        limit,
      },
      data: StatusData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchLeadStatusById = async (req, res) => {
  try {
    let StatusId = req.params.id;
    let StatusData = await LEADSTATUS.findById(StatusId);
    if (!StatusData) {
      throw new Error("Lead Status not found");
    }
    return res.status(200).json({
      status: "Success",
      message: "Lead Status fetched successfully",
      data: StatusData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.LeadStatusUpdate = async (req, res) => {
  try {
    let StatusId = req.params.id;
    let oldLeadStatus = await LEADSTATUS.findById(StatusId);
    if (!oldLeadStatus) {
      throw new Error("Lead Status not found");
    }
    if (oldLeadStatus.name && ["new lead", "won", "lost"].includes(oldLeadStatus.name.toLowerCase()) && req.body.name && req.body.name.toLowerCase() !== oldLeadStatus.name.toLowerCase()) {
      throw new Error("Cannot rename default lead statuses");
    }
    let updatedStatus = await LEADSTATUS.findByIdAndUpdate(StatusId, req.body, {
      new: true,
    });
    await syncLeadStatusOrders();
    updatedStatus = await LEADSTATUS.findById(updatedStatus._id);
    return res.status(200).json({
      status: "Success",
      message: "Lead Status updated successfully",
      data: updatedStatus,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.LeadStatusDelete = async (req, res) => {
  try {
    let StatusId = req.params.id;
    let oldLeadStatus = await LEADSTATUS.findById(StatusId);

    if (!oldLeadStatus) {
      throw new Error("Lead Status not found");
    }
    if (oldLeadStatus.name && ["new lead", "won", "lost"].includes(oldLeadStatus.name.toLowerCase())) {
      throw new Error("Cannot delete default lead status");
    }
    await LEADSTATUS.findByIdAndDelete(StatusId);
    await syncLeadStatusOrders();

    return res.status(200).json({
      status: "Success",
      message: "Lead Status deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
