const jwt = require("jsonwebtoken");
const STAFF = require("../model/staff");

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const staff = await STAFF.findById(decoded.id).populate("role");
    
    if (!staff || staff.isDeleted) {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    req.user = staff;
    req.permissions = staff.role.allowedStatuses || [];
    req.canAccessDashboard = staff.role.canAccessDashboard || false;
    req.canAccessSettings = staff.role.canAccessSettings || false;
    req.canAccessAccountMaster = staff.role.canAccessAccountMaster || false;
    req.accountMasterViewType = staff.role.accountMasterViewType || 'view_own';
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}
module.exports = authMiddleware;
