let mongoose = require("mongoose");
let Schema = mongoose.Schema;
const { LEAD_STATUSES } = require("../constants/leadStatus");

let RoleSchema = new Schema(
  {
    roleName: {
      type: String,
      required: [true, "Role Name is Required"],
      unique: true,
    },
    allowedStatuses: [{
      type: String,
      enum: LEAD_STATUSES,
    }],
    canAccessDashboard: {
      type: Boolean,
      default: false,
    },
    canAccessSettings: {
      type: Boolean,
      default: false,
    },
    canAccessAccountMaster: {
      type: Boolean,
      default: false,
    },
    accountMasterViewType: {
      type: String,
      enum: ['view_all', 'view_own'],
      default: 'view_own',
    },
    canAccessProduction: {
      type: Boolean,
      default: false,
    },
    canAccessLeads: {
      type: Boolean,
      default: false,
    },
    canAccessReports: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

let ROLE = mongoose.model("Role", RoleSchema);
module.exports = ROLE;
