const Setting = require("../model/setting");

exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.find();
    const settingsMap = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    return res.status(200).json({
      status: "Success",
      data: settingsMap,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body; // Expecting { "leadRequiredFields": [...], "taskRequiredFields": [...] }
    
    if (!settings || typeof settings !== 'object') {
      throw new Error("Invalid settings data");
    }

    const updatePromises = Object.entries(settings).map(([key, value]) => {
      return Setting.findOneAndUpdate(
        { key },
        { value },
        { upsert: true, new: true }
      );
    });

    await Promise.all(updatePromises);

    return res.status(200).json({
      status: "Success",
      message: "Settings updated successfully",
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getSettingByKey = async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await Setting.findOne({ key });
      return res.status(200).json({
        status: "Success",
        data: setting ? setting.value : null,
      });
    } catch (error) {
      return res.status(500).json({
        status: "Fail",
        message: error.message,
      });
    }
  };
