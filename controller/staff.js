const STAFF = require("../model/staff");
const ROLE = require("../model/role");
const { encryptData, decryptData } = require("../utils/crypto");
const jwt = require("jsonwebtoken");
const { validateEmail, validatePhone, validatePassword, validateRequiredField } = require("../utils/validation");
const { sanitizeQuery } = require("../utils/sanitize");

exports.createStaff = async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body;

    // Validation
    if (!validateRequiredField(fullName)) {
      throw new Error("Full name is required");
    }
    if (!validateEmail(email)) {
      throw new Error("Invalid email address");
    }
    if (!validatePhone(phone)) {
      throw new Error("Phone number must be exactly 12 digits (91 + 10 digits)");
    }
    if (!validatePassword(password)) {
      throw new Error("Password must be at least 6 characters");
    }
    if (!validateRequiredField(role)) {
      throw new Error("Role is required");
    }

    let staffFindWithEmail = await STAFF.findOne({ email, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] });
    if (staffFindWithEmail) throw new Error("Email already exists");
    let staffFindWithPhone = await STAFF.findOne({ phone, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] });
    if (staffFindWithPhone) throw new Error("Phone number already exists");

    const roleExists = await ROLE.findById(role);
    if (!roleExists) throw new Error("Role not found");

    const encryptedPassword = encryptData(password);

    const staffData = {
      fullName,
      email,
      phone,
      password: encryptedPassword,
      role,
    };

    const staffDetails = await STAFF.create(staffData);
    const populatedStaff = await STAFF.findById(staffDetails._id).populate("role");

    return res.status(201).json({
      status: "Success",
      message: "Staff created successfully",
      data: populatedStaff,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.loginStaff = async (req, res) => {
  try {
    let { email, password } = req.body;
    
    // Sanitize input - prevent NoSQL injection
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new Error("Invalid input format");
    }
    
    // Sanitize to remove MongoDB operators
    const sanitizedBody = sanitizeQuery({ email, password });
    email = sanitizedBody.email ? sanitizedBody.email.trim().toLowerCase() : '';
    password = sanitizedBody.password || '';
    
    // Validation
    if (!validateEmail(email)) {
      throw new Error("Invalid email address");
    }
    if (!validateRequiredField(password)) {
      throw new Error("Password is required");
    }
    
    let staffverify = await STAFF.findOne({ email }).populate("role");
    if (!staffverify) {
      throw new Error("Staff not found");
    }
    let decryptedPassword = decryptData(staffverify.password);

    if (String(decryptedPassword) !== password) {
      throw new Error("Invalid password");
    }
    let token = jwt.sign({ id: staffverify._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    let refreshToken = jwt.sign({ id: staffverify._id }, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: '7d' });
    
    return res.status(200).json({
      status: "Success",
      message: "Staff logged in successfully",
      token,
      refreshToken,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);
    const staff = await STAFF.findById(decoded.id).populate("role");
    
    if (!staff) {
      throw new Error("Staff not found");
    }
    
    const newToken = jwt.sign({ id: staff._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign({ id: staff._id }, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: '7d' });
    
    return res.status(200).json({
      status: "Success",
      message: "Token refreshed successfully",
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({
      status: "Fail",
      message: error.message || "Invalid refresh token",
    });
  }
};

exports.fetchAllStaffs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sanitizedQuery = sanitizeQuery(req.query);
    const search = sanitizedQuery.search || "";

    const query = {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        },
      ],
    };

    const totalStaff = await STAFF.countDocuments(query);
    const staffsData = await STAFF.find(query)
      .populate("role")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })

    return res.status(200).json({
      status: "Success",
      message: "Staffs fetched successfully",
      pagination: {
        totalRecords: totalStaff,
        currentPage: page,
        totalPages: Math.ceil(totalStaff / limit),
        limit,
      },
      data: staffsData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllStaffsForDropdown = async (req, res) => {
  try {
    const query = {
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    };

    const staffsData = await STAFF.find(query)
      .populate('role', 'canAccessAccountMaster')
      .select('_id fullName role')
      .sort({ fullName: 1 });

    return res.status(200).json({
      status: "Success",
      message: "Staffs fetched successfully",
      data: staffsData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchStaffById = async (req, res) => {
  try {
    let staffId = req.params.id;
    let staffData = await STAFF.findById(staffId).populate("role");
    if (!staffData) {
      throw new Error("Staff not found");
    }
    return res.status(200).json({
      status: "Success",
      message: "Staff fetched successfully",
      data: staffData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.staffUpdate = async (req, res) => {
  try {
    let staffId = req.params.id;
    const { email, phone, password } = req.body;
    
    let oldStaff = await STAFF.findById(staffId);

    if (!oldStaff) {
      throw new Error("Staff not found");
    }
    
    // Validation
    if (email && !validateEmail(email)) {
      throw new Error("Invalid email address");
    }
    if (phone && !validatePhone(phone)) {
      throw new Error("Phone number must be exactly 12 digits (91 + 10 digits)");
    }
    if (password && !validatePassword(password)) {
      throw new Error("Password must be at least 6 characters");
    }
    
    // Check for duplicate email/phone if changed
    if (email && email !== oldStaff.email) {
      const existingEmail = await STAFF.findOne({ email, isDeleted: false, _id: { $ne: staffId } });
      if (existingEmail) throw new Error("Email already exists");
    }
    if (phone && phone !== oldStaff.phone) {
      const existingPhone = await STAFF.findOne({ phone, isDeleted: false, _id: { $ne: staffId } });
      if (existingPhone) throw new Error("Phone number already exists");
    }
    
    if (req.body.password) {
      req.body.password = encryptData(req.body.password);
    }
    let updatedStaff = await STAFF.findByIdAndUpdate(staffId, req.body, {
      new: true,
    }).populate("role");
    return res.status(200).json({
      status: "Success",
      message: "Staff updated successfully",
      data: updatedStaff,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.staffDelete = async (req, res) => {
  try {
    let staffId = req.params.id;
    let oldStaff = await STAFF.findById(staffId);

    if (!oldStaff) {
      throw new Error("Staff not found");
    }
    
    await STAFF.findByIdAndUpdate(staffId, { isDeleted: true });

    return res.status(200).json({
      status: "Success",
      message: "Staff deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const staff = await STAFF.findById(req.user._id).populate("role");
    
    if (!staff) {
      throw new Error("User not found");
    }

    return res.status(200).json({
      status: "Success",
      data: {
        id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        roleName: staff.role.roleName,
        permissions: staff.role.allowedStatuses,
        canAccessDashboard: staff.role.canAccessDashboard,
        canAccessSettings: staff.role.canAccessSettings,
        canAccessAccountMaster: staff.role.canAccessAccountMaster,
        accountMasterViewType: staff.role.accountMasterViewType,
        canAccessProduction: staff.role.canAccessProduction,
        canAccessLeads: staff.role.canAccessLeads,
        canAccessReports: staff.role.canAccessReports,
      },
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
