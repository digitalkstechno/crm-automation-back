const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Role = require("../model/role");
const Staff = require("../model/staff");
const Lead = require("../model/lead");
const Task = require("../model/task");
const LeadStatus = require("../model/leadStatus");
const LeadSource = require("../model/leadSources");
const LeadLabel = require("../model/leadLabel");
const TaskStatus = require("../model/taskStatus");
const Organization = require("../model/organization");
const Team = require("../model/team");

const { setupDefaultLeadStatuses } = require("../controller/leadStatus");
const { setupDefaultTaskStatuses } = require("../controller/taskStatus");
const { encryptData } = require("../utils/crypto");

// Realistic Data Arrays
const countryCodes = ["+91", "+1", "+44", "+61", "+49"];
const firstNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Zara", "Diya", "Aanya", "Isha", "Neha", "John", "Emma", "Michael", "Sophia", "David", "Olivia"];
const lastNames = ["Sharma", "Verma", "Patel", "Singh", "Kumar", "Gupta", "Rao", "Das", "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller"];
const companies = ["TechVision Solutions", "Global Innovate", "NextGen Systems", "Apex Dynamics", "Quantum Leap", "Pinnacle Corp", "Synergy Tech", "Alpha Logistics", "BlueOcean IT", "Zenith Services", "Nimbus Cloud", "Vertex Media"];
const domains = ["techvision.in", "globalinnovate.com", "nextgensys.co", "apexdynamics.net", "quantumleap.io", "pinnacle.com", "synergytech.org", "alphalogistics.in", "blueocean.com", "zenith.co.in"];
const notes = [
  "Interested in premium plan. Requested a demo next week.",
  "Looking for custom API integrations. Need tech team consultation.",
  "Budget constraints discussed. Will follow up next quarter.",
  "Very enthusiastic. Sent pricing quotation.",
  "Left a voicemail. Will try calling again tomorrow.",
  "Compared our product with competitor. Needs more feature details.",
  "Referred by an existing client. High chance of conversion.",
  "Just exploring options currently. Add to newsletter."
];
const subjects = [
  "Product Demonstration Call",
  "Send Revised Quotation",
  "Technical Consultation",
  "Follow up on Proposal",
  "Contract Negotiation",
  "Introductory Meet",
  "Requirement Gathering"
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedData() {
  try {
    console.log("Seeding database... This will delete all existing data.");

    // Delete existing data
    await Role.deleteMany({});
    await Staff.deleteMany({});
    await Lead.deleteMany({});
    await Task.deleteMany({});
    await LeadStatus.deleteMany({});
    await LeadSource.deleteMany({});
    await LeadLabel.deleteMany({});
    await TaskStatus.deleteMany({});
    await Organization.deleteMany({});
    await Team.deleteMany({});

    console.log("All old data deleted successfully.");

    // Initialize Default Statuses from Controllers
    await setupDefaultLeadStatuses();
    await setupDefaultTaskStatuses();

    // 1. Organizations & Teams
    const org1 = await Organization.create({ name: "Tech Innovators Pvt Ltd" });
    const org2 = await Organization.create({ name: "Global Services Group" });

    const teamSales = await Team.create({ name: "Direct Sales Team", organization: org1._id });
    const teamMarketing = await Team.create({ name: "Digital Marketing", organization: org1._id });
    const teamEnterprise = await Team.create({ name: "Enterprise Solutions", organization: org2._id });

    // 2. Roles
    const adminRole = await Role.create({
      roleName: "Super Admin",
      permissions: [{
        setup: { create: true, readAll: true, update: true, delete: true },
        lead: { create: true, readOwn: true, readAll: true, update: true, delete: true },
        task: { create: true, readOwn: true, readAll: true, update: true, delete: true },
        taskStatus: { create: true, readOwn: true, readAll: true, update: true, delete: true },
        staff: { create: true, readOwn: true, readAll: true, update: true, delete: true },
        role: { create: true, readOwn: true, readAll: true, update: true, delete: true },
        leadStatus: { create: true, readOwn: true, readAll: true, update: true, delete: true },
        leadSource: { create: true, readOwn: true, readAll: true, update: true, delete: true },
        leadLabel: { create: true, readOwn: true, readAll: true, update: true, delete: true },
        teams: { create: true, readOwn: true, readAll: true, update: true, delete: true },
        organizations: { create: true, readOwn: true, readAll: true, update: true, delete: true }
      }]
    });

    const userRole = await Role.create({
      roleName: "Sales Executive",
      permissions: [{
        setup: { create: false, readAll: false, update: false, delete: false },
        lead: { create: true, readOwn: true, readAll: false, update: true, delete: false },
        task: { create: true, readOwn: true, readAll: false, update: true, delete: false },
        taskStatus: { create: false, readOwn: true, readAll: true, update: false, delete: false },
        staff: { create: false, readOwn: true, readAll: false, update: false, delete: false },
        role: { create: false, readOwn: true, readAll: false, update: false, delete: false },
        leadStatus: { create: false, readOwn: true, readAll: true, update: false, delete: false },
        leadSource: { create: false, readOwn: true, readAll: true, update: false, delete: false },
        leadLabel: { create: false, readOwn: true, readAll: true, update: false, delete: false },
        teams: { create: false, readOwn: false, readAll: false, update: false, delete: false },
        organizations: { create: false, readOwn: false, readAll: false, update: false, delete: false }
      }]
    });

    // 3. Staff (Users) with Hashed Passwords and Org/Team associations
    const hashedPass = encryptData("password123");

    const adminUser = await Staff.create({
      fullName: "Manav Admin",
      email: "admin@crm.com",
      countryCode: "+91",
      phone: "9876543210",
      password: hashedPass,
      role: adminRole._id,
      status: "active",
      organizations: [org1._id, org2._id],
      teams: [teamSales._id, teamMarketing._id, teamEnterprise._id]
    });

    const user1 = await Staff.create({
      fullName: "Rahul Sales",
      email: "rahul@crm.com",
      countryCode: "+91",
      phone: "9988776655",
      password: hashedPass,
      role: userRole._id,
      status: "active",
      organizations: [org1._id],
      teams: [teamSales._id]
    });

    const user2 = await Staff.create({
      fullName: "Priya Marketing",
      email: "priya@crm.com",
      countryCode: "+44",
      phone: "9988776644",
      password: hashedPass,
      role: userRole._id,
      status: "active",
      organizations: [org1._id],
      teams: [teamMarketing._id]
    });

    const user3 = await Staff.create({
      fullName: "Amit Enterprise",
      email: "amit@crm.com",
      countryCode: "+1",
      phone: "9988776633",
      password: hashedPass,
      role: userRole._id,
      status: "active",
      organizations: [org2._id],
      teams: [teamEnterprise._id]
    });

    // Update Team Leaders
    await Team.findByIdAndUpdate(teamSales._id, { teamLeader: user1._id });
    await Team.findByIdAndUpdate(teamMarketing._id, { teamLeader: user2._id });
    await Team.findByIdAndUpdate(teamEnterprise._id, { teamLeader: user3._id });

    const staffList = [adminUser, user1, user2, user3];
    const teamList = [teamSales, teamMarketing, teamEnterprise];

    // Fetch newly created default statuses
    const leadStatuses = await LeadStatus.find();
    const taskStatuses = await TaskStatus.find();

    const leadSources = await LeadSource.insertMany([
      { name: "Website Signup", order: 1 },
      { name: "Client Referral", order: 2 },
      { name: "Cold Email", order: 3 },
      { name: "LinkedIn Ads", order: 4 },
      { name: "Google Search", order: 5 },
    ]);

    const leadLabels = await LeadLabel.insertMany([
      { name: "High Priority", color: "#FF0000", order: 1 },
      { name: "Medium Priority", color: "#FFA500", order: 2 },
      { name: "Low Priority", color: "#0000FF", order: 3 },
    ]);

    // 4. Time Setup for historical, yesterday, today, tomorrow
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // 5. Generate Random Historical Data (6 months)
    for (let i = 0; i < 60; i++) {
      let createdDate = randomDate(sixMonthsAgo, today);
      let fName = getRandom(firstNames);
      let lName = getRandom(lastNames);
      let comp = getRandom(companies);
      let dom = getRandom(domains);
      let assignedStaff = getRandom(staffList);
      
      let leadStatusObj = getRandom(leadStatuses);
      let isWon = leadStatusObj.name.toLowerCase() === 'won';
      let isLost = leadStatusObj.name.toLowerCase() === 'lost';

      let lead = await Lead.create({
        fullName: `${fName} ${lName}`,
        countryCode: getRandom(countryCodes),
        contact: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        email: `${fName.toLowerCase()}.${lName.toLowerCase()}@${dom}`,
        companyName: comp,
        address: `${Math.floor(Math.random() * 500)} Business Park, IT City`,
        leadStatus: leadStatusObj._id,
        leadSource: getRandom(leadSources)._id,
        leadLabel: [getRandom(leadLabels)._id],
        assignedTo: assignedStaff._id,
        createdAt: createdDate,
        nextFollowupDate: new Date(createdDate.getTime() + (Math.random() * 7 * 86400000)),
        paymentAmount: isWon ? Math.floor(Math.random() * 50000) + 10000 : 0,
        isWon: isWon,
        wonDate: isWon ? new Date(createdDate.getTime() + (Math.random() * 3 * 86400000)) : undefined,
        isLost: isLost,
        lostDate: isLost ? new Date(createdDate.getTime() + (Math.random() * 3 * 86400000)) : undefined,
        lostReason: isLost ? "Budget issues" : undefined,
        followUps: [{
            date: createdDate,
            time: "11:30",
            note: getRandom(notes),
            staff: assignedStaff._id,
            createdAt: createdDate
        }],
        note: getRandom(notes)
      });

      if (Math.random() > 0.4) {
        let selectedOrg = Math.random() > 0.5 ? org1 : org2;
        await Task.create({
          subject: getRandom(subjects) + ` - ${comp}`,
          description: getRandom(notes),
          startDate: createdDate,
          endDate: new Date(createdDate.getTime() + Math.random() * 3 * 86400000), // up to 3 days
          taskStatus: getRandom(taskStatuses)._id,
          assignedUsers: [assignedStaff._id],
          assignedTeams: [getRandom(teamList)._id],
          organization: selectedOrg._id,
          createdBy: adminUser._id,
          createdAt: createdDate
        });
      }
    }

    // 6. Generate Specific Follow-ups (Yesterday, Today, Tomorrow)
    const specificDates = [
        { label: 'Yesterday', date: yesterday, type: 'Missed Followup' },
        { label: 'Today', date: today, type: 'Urgent Action Required' },
        { label: 'Tomorrow', date: tomorrow, type: 'Upcoming Meeting' }
    ];

    for (const {label, date, type} of specificDates) {
        let fName = getRandom(firstNames);
        let lName = getRandom(lastNames);
        let comp = getRandom(companies);

        await Lead.create({
            fullName: `${fName} ${lName} (${label})`,
            countryCode: getRandom(countryCodes),
            contact: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
            email: `${fName.toLowerCase()}@${getRandom(domains)}`,
            companyName: comp,
            leadStatus: leadStatuses[0]._id, // New Lead
            leadSource: getRandom(leadSources)._id,
            leadLabel: [leadLabels[0]._id], // High Priority
            assignedTo: user1._id,
            nextFollowupDate: date,
            nextFollowupTime: date >= today ? "23:59" : "10:00",
            followUps: [{
                date: date,
                time: "14:00",
                note: `[${type}] Scheduled follow up regarding enterprise deal.`,
                staff: user1._id,
                createdAt: today
            }]
        });

        await Task.create({
            subject: `[${label}] ${getRandom(subjects)} with ${comp}`,
            description: `This is a priority task scheduled for ${label}. Please prepare the documents.`,
            startDate: date,
            endDate: date,
            taskStatus: taskStatuses[0]._id, // To Do
            assignedUsers: [user1._id, user2._id],
            assignedTeams: [teamSales._id],
            organization: org1._id,
            createdBy: adminUser._id
        });
    }

    console.log("Demo Data Seeded successfully with Production-Ready values!");
  } catch (error) {
    console.error("Error during seeding data:", error);
  }
}

module.exports = { seedData };

if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  }).then(async () => {
    await seedData();
    process.exit(0);
  }).catch((err) => {
    console.error("Connection failed", err);
    process.exit(1);
  });
}
