const mongoose = require("mongoose");
require("dotenv").config();

const Role = require("./model/role");
const Staff = require("./model/staff");
const { LEAD_STATUSES } = require("./constants/leadStatus");
const { encryptData } = require("./utils/crypto");

const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/client-crm";

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin role exists
    let adminRole = await Role.findOne({ roleName: "Admin" });
    
    if (!adminRole) {
      // Create Admin Role with all permissions
      adminRole = await Role.create({
        roleName: "Admin",
        allowedStatuses: LEAD_STATUSES,
        canAccessDashboard: true,
        canAccessSettings: true,
        canAccessAccountMaster: true,
        accountMasterViewType: "view_all",
        canAccessProduction: true,
        canAccessLeads: true,
        canAccessReports: true,
        isActive: true,
      });
      console.log("✅ Admin Role created");
    } else {
      // Update existing admin role with all permissions
      await Role.findByIdAndUpdate(adminRole._id, {
        allowedStatuses: LEAD_STATUSES,
        canAccessDashboard: true,
        canAccessSettings: true,
        canAccessAccountMaster: true,
        accountMasterViewType: "view_all",
        canAccessProduction: true,
        canAccessLeads: true,
        canAccessReports: true,
        isActive: true,
      });
      console.log("✅ Admin Role updated with all permissions");
    }

    // Check if admin user exists
    let adminUser = await Staff.findOne({ email: "admin@gmail.com" });
    
    if (adminUser) {
      // Update existing admin user
      const hashedPassword = encryptData("123456");
      await Staff.findByIdAndUpdate(adminUser._id, {
        password: hashedPassword,
        role: adminRole._id,
        isDeleted: false,
      });
      console.log("✅ Admin User updated");
    } else {
      // Create new admin user
      const hashedPassword = encryptData("123456");
      await Staff.create({
        fullName: "Admin User",
        email: "admin@gmail.com",
        phone: "919999999999",
        password: hashedPassword,
        role: adminRole._id,
      });
      console.log("✅ Admin User created");
    }

    console.log("\n🎉 Admin seeding completed successfully!");
    console.log("\n👤 Admin Credentials:");
    console.log("   Email: admin@gmail.com");
    console.log("   Password: 123456");
    console.log("   Role: Admin (All permissions enabled)\n");
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

seedAdmin();
