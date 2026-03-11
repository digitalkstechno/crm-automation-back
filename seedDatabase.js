const mongoose = require("mongoose");
require("dotenv").config();

const Role = require("./model/role");
const Staff = require("./model/staff");
const ClientType = require("./model/clientType");
const CustomizationType = require("./model/customizationType");
const InquiryCategory = require("./model/inquiryCategory");
const SourceFrom = require("./model/sourceFrom");
const ModelSuggestion = require("./model/modelSuggestion");
const AccountMaster = require("./model/accountMaster");
const Lead = require("./model/lead");

const { LEAD_STATUSES } = require("./constants/leadStatus");
const { encryptData } = require("./utils/crypto");

const MONGODB_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/crm_db";

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await Role.deleteMany({});
    await Staff.deleteMany({});
    await ClientType.deleteMany({});
    await CustomizationType.deleteMany({});
    await InquiryCategory.deleteMany({});
    await SourceFrom.deleteMany({});
    await ModelSuggestion.deleteMany({});
    await AccountMaster.deleteMany({});
    await Lead.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // ==================== 5 ROLES ====================
    const roles = await Role.insertMany([
      {
        roleName: "Admin",
        allowedStatuses: LEAD_STATUSES,
        canAccessDashboard: true,
        canAccessSettings: true,
        canAccessAccountMaster: true,
        accountMasterViewType: "view_all",
        isActive: true,
      },
      {
        roleName: "Sales Manager",
        allowedStatuses: [
          "New Lead",
          "Quotation Given",
          "Follow Up",
          "Order Confirmation",
          "PI",
        ],
        canAccessDashboard: true,
        canAccessSettings: false,
        canAccessAccountMaster: true,
        accountMasterViewType: "view_all",
        isActive: true,
      },
      {
        roleName: "Sales Executive",
        allowedStatuses: ["New Lead", "Quotation Given", "Follow Up"],
        canAccessDashboard: true,
        canAccessSettings: false,
        canAccessAccountMaster: true,
        accountMasterViewType: "view_own",
        isActive: true,
      },
      {
        roleName: "Operations Team",
        allowedStatuses: [
          "Order Execution",
          "Final Payment",
          "Dispatch",
          "Completed",
        ],
        canAccessDashboard: true,
        canAccessSettings: false,
        canAccessAccountMaster: false,
        accountMasterViewType: "view_own",
        isActive: true,
      },
      {
        roleName: "Viewer",
        allowedStatuses: [],
        canAccessDashboard: true,
        canAccessSettings: false,
        canAccessAccountMaster: false,
        accountMasterViewType: "view_own",
        isActive: true,
      },
    ]);
    console.log("✅ Created 5 Roles");

    // ==================== 5 USERS ====================
    const hashedPassword = encryptData("123456");
    const users = await Staff.insertMany([
      {
        fullName: "Rajesh Kumar",
        email: "rajesh.kumar@example.com",
        phone: "9876543210",
        password: hashedPassword,
        role: roles[0]._id, // Admin
      },
      {
        fullName: "Priya Sharma",
        email: "priya.sharma@example.com",
        phone: "9876543211",
        password: hashedPassword,
        role: roles[1]._id, // Sales Manager
      },
      {
        fullName: "Amit Patel",
        email: "amit.patel@example.com",
        phone: "9876543212",
        password: hashedPassword,
        role: roles[2]._id, // Sales Executive
      },
      {
        fullName: "Sneha Gupta",
        email: "sneha.gupta@example.com",
        phone: "9876543213",
        password: hashedPassword,
        role: roles[3]._id, // Operations Team
      },
      {
        fullName: "Vikram Singh",
        email: "vikram.singh@example.com",
        phone: "9876543214",
        password: hashedPassword,
        role: roles[4]._id, // Viewer
      },
    ]);
    console.log("✅ Created 5 Users (Password: 123456)");

    // ==================== 20 CLIENT TYPES ====================
    const clientTypes = await ClientType.insertMany([
      { name: "Corporate", isHighlight: true },
      { name: "Retail", isHighlight: false },
      { name: "Wholesale", isHighlight: true },
      { name: "Government", isHighlight: false },
      { name: "Educational Institution", isHighlight: false },
      { name: "Healthcare", isHighlight: false },
      { name: "Manufacturing", isHighlight: true },
      { name: "IT Services", isHighlight: false },
      { name: "E-commerce", isHighlight: true },
      { name: "Real Estate", isHighlight: false },
      { name: "Hospitality", isHighlight: false },
      { name: "Banking & Finance", isHighlight: true },
      { name: "Logistics", isHighlight: false },
      { name: "Pharmaceutical", isHighlight: false },
      { name: "Automotive", isHighlight: true },
      { name: "Textile", isHighlight: false },
      { name: "Food & Beverage", isHighlight: false },
      { name: "Construction", isHighlight: false },
      { name: "Media & Entertainment", isHighlight: false },
      { name: "NGO", isHighlight: false },
    ]);
    console.log("✅ Created 20 Client Types");

    // ==================== 20 CUSTOMIZATION TYPES ====================
    const customizationTypes = await CustomizationType.insertMany([
      { name: "Standard" },
      { name: "Premium" },
      { name: "Deluxe" },
      { name: "Custom Design" },
      { name: "Engraving" },
      { name: "Color Customization" },
      { name: "Size Modification" },
      { name: "Logo Printing" },
      { name: "Gift Wrapping" },
      { name: "Personalized Message" },
      { name: "Special Packaging" },
      { name: "Express Delivery" },
      { name: "Bulk Order" },
      { name: "Sample Order" },
      { name: "Trial Order" },
      { name: "Prototype" },
      { name: "Limited Edition" },
      { name: "Seasonal Special" },
      { name: "Corporate Branding" },
      { name: "Eco-Friendly" },
    ]);
    console.log("✅ Created 20 Customization Types");

    // ==================== 20 INQUIRY CATEGORIES ====================
    const inquiryCategories = await InquiryCategory.insertMany([
      { name: "Electronics" },
      { name: "Furniture" },
      { name: "Stationery" },
      { name: "Gifts & Hampers" },
      { name: "Corporate Gifts" },
      { name: "Promotional Items" },
      { name: "Office Supplies" },
      { name: "Trophies & Awards" },
      { name: "Customized Merchandise" },
      { name: "Printing Services" },
      { name: "Packaging Materials" },
      { name: "Textile Products" },
      { name: "Leather Goods" },
      { name: "Accessories" },
      { name: "Home Decor" },
      { name: "Kitchen Appliances" },
      { name: "Sports Equipment" },
      { name: "Toys & Games" },
      { name: "Books & Publications" },
      { name: "Art & Craft Supplies" },
    ]);
    console.log("✅ Created 20 Inquiry Categories");

    // ==================== 20 SOURCE FROM ====================
    const sourcesFrom = await SourceFrom.insertMany([
      { name: "Website" },
      { name: "Facebook" },
      { name: "Instagram" },
      { name: "LinkedIn" },
      { name: "Twitter" },
      { name: "Google Ads" },
      { name: "Email Campaign" },
      { name: "Trade Show" },
      { name: "Referral" },
      { name: "Cold Call" },
      { name: "Walk-in" },
      { name: "WhatsApp" },
      { name: "YouTube" },
      { name: "Newspaper Ad" },
      { name: "Magazine Ad" },
      { name: "Radio" },
      { name: "TV Commercial" },
      { name: "Partner Network" },
      { name: "Existing Client" },
      { name: "Direct Mail" },
    ]);
    console.log("✅ Created 20 Source From");

    // ==================== 20 MODEL SUGGESTIONS ====================
    const modelSuggestions = await ModelSuggestion.insertMany([
      {
        name: "Premium Pen Set",
        modelNo: "PPS-001",
        rate: "1500",
        gst: 18,
        category: inquiryCategories[2]._id,
      },
      {
        name: "Executive Diary",
        modelNo: "ED-002",
        rate: "800",
        gst: 12,
        category: inquiryCategories[2]._id,
      },
      {
        name: "Wireless Mouse",
        modelNo: "WM-003",
        rate: "650",
        gst: 18,
        category: inquiryCategories[0]._id,
      },
      {
        name: "USB Flash Drive 32GB",
        modelNo: "UFD-004",
        rate: "450",
        gst: 18,
        category: inquiryCategories[0]._id,
      },
      {
        name: "Coffee Mug Set",
        modelNo: "CMS-005",
        rate: "350",
        gst: 12,
        category: inquiryCategories[3]._id,
      },
      {
        name: "Desk Organizer",
        modelNo: "DO-006",
        rate: "900",
        gst: 18,
        category: inquiryCategories[6]._id,
      },
      {
        name: "Trophy Gold Plated",
        modelNo: "TGP-007",
        rate: "2500",
        gst: 18,
        category: inquiryCategories[7]._id,
      },
      {
        name: "Corporate T-Shirt",
        modelNo: "CTS-008",
        rate: "300",
        gst: 5,
        category: inquiryCategories[8]._id,
      },
      {
        name: "Leather Wallet",
        modelNo: "LW-009",
        rate: "1200",
        gst: 18,
        category: inquiryCategories[12]._id,
      },
      {
        name: "Power Bank 10000mAh",
        modelNo: "PB-010",
        rate: "1800",
        gst: 18,
        category: inquiryCategories[0]._id,
      },
      {
        name: "Notebook A5 Size",
        modelNo: "NB-011",
        rate: "150",
        gst: 12,
        category: inquiryCategories[2]._id,
      },
      {
        name: "Water Bottle Steel",
        modelNo: "WBS-012",
        rate: "400",
        gst: 18,
        category: inquiryCategories[3]._id,
      },
      {
        name: "Backpack Premium",
        modelNo: "BP-013",
        rate: "2200",
        gst: 18,
        category: inquiryCategories[13]._id,
      },
      {
        name: "Wall Clock Designer",
        modelNo: "WCD-014",
        rate: "1100",
        gst: 18,
        category: inquiryCategories[14]._id,
      },
      {
        name: "Keychain Metal",
        modelNo: "KM-015",
        rate: "80",
        gst: 18,
        category: inquiryCategories[13]._id,
      },
      {
        name: "Calendar Desk 2024",
        modelNo: "CD-016",
        rate: "250",
        gst: 12,
        category: inquiryCategories[9]._id,
      },
      {
        name: "Umbrella Folding",
        modelNo: "UF-017",
        rate: "500",
        gst: 18,
        category: inquiryCategories[13]._id,
      },
      {
        name: "Laptop Bag",
        modelNo: "LB-018",
        rate: "1600",
        gst: 18,
        category: inquiryCategories[13]._id,
      },
      {
        name: "Bluetooth Speaker",
        modelNo: "BS-019",
        rate: "2800",
        gst: 18,
        category: inquiryCategories[0]._id,
      },
      {
        name: "Photo Frame Digital",
        modelNo: "PFD-020",
        rate: "3500",
        gst: 18,
        category: inquiryCategories[14]._id,
      },
    ]);
    console.log("✅ Created 20 Model Suggestions");

    // ==================== 20 ACCOUNT MASTERS ====================
    const accountMasters = await AccountMaster.insertMany([
      {
        companyName: "Tech Solutions Pvt Ltd",
        clientName: "Rahul Mehta",
        address: {
          line1: "123 MG Road",
          line2: "Near City Mall",
          cityName: "Mumbai",
          stateName: "Maharashtra",
          countryName: "India",
        },
        mobile: "9123456780",
        email: "rahul@techsolutions.com",
        website: "www.techsolutions.com",
        sourcebyTypeOfClient: clientTypes[0]._id,
        sourceFrom: sourcesFrom[0]._id,
        assignBy: users[2]._id,
        remark: "High potential client",
      },
      {
        companyName: "Global Enterprises",
        clientName: "Anjali Verma",
        address: {
          line1: "456 Park Street",
          line2: "Sector 5",
          cityName: "Delhi",
          stateName: "Delhi",
          countryName: "India",
        },
        mobile: "9123456781",
        email: "anjali@globalent.com",
        website: "www.globalenterprises.com",
        sourcebyTypeOfClient: clientTypes[2]._id,
        sourceFrom: sourcesFrom[8]._id,
        assignBy: users[2]._id,
        remark: "Referred by existing client",
      },
      {
        companyName: "Sunrise Industries",
        clientName: "Karan Kapoor",
        address: {
          line1: "789 Ring Road",
          line2: "Industrial Area",
          cityName: "Bangalore",
          stateName: "Karnataka",
          countryName: "India",
        },
        mobile: "9123456782",
        email: "karan@sunrise.com",
        website: "www.sunriseindustries.com",
        sourcebyTypeOfClient: clientTypes[6]._id,
        sourceFrom: sourcesFrom[7]._id,
        assignBy: users[1]._id,
        remark: "Met at trade show",
      },
      {
        companyName: "Retail Hub",
        clientName: "Neha Joshi",
        address: {
          line1: "321 Market Road",
          line2: "Central Plaza",
          cityName: "Pune",
          stateName: "Maharashtra",
          countryName: "India",
        },
        mobile: "9123456783",
        email: "neha@retailhub.com",
        website: "www.retailhub.com",
        sourcebyTypeOfClient: clientTypes[1]._id,
        sourceFrom: sourcesFrom[1]._id,
        assignBy: users[2]._id,
        remark: "Social media lead",
      },
      {
        companyName: "EduTech Solutions",
        clientName: "Suresh Reddy",
        address: {
          line1: "654 College Road",
          line2: "University Area",
          cityName: "Hyderabad",
          stateName: "Telangana",
          countryName: "India",
        },
        mobile: "9123456784",
        email: "suresh@edutech.com",
        website: "www.edutechsolutions.com",
        sourcebyTypeOfClient: clientTypes[4]._id,
        sourceFrom: sourcesFrom[3]._id,
        assignBy: users[2]._id,
        remark: "LinkedIn connection",
      },
      {
        companyName: "HealthCare Plus",
        clientName: "Dr. Meera Shah",
        address: {
          line1: "987 Hospital Road",
          line2: "Medical District",
          cityName: "Chennai",
          stateName: "Tamil Nadu",
          countryName: "India",
        },
        mobile: "9123456785",
        email: "meera@healthcareplus.com",
        website: "www.healthcareplus.com",
        sourcebyTypeOfClient: clientTypes[5]._id,
        sourceFrom: sourcesFrom[10]._id,
        assignBy: users[1]._id,
        remark: "Walk-in inquiry",
      },
      {
        companyName: "Fashion Trends",
        clientName: "Pooja Malhotra",
        address: {
          line1: "147 Fashion Street",
          line2: "Shopping Complex",
          cityName: "Kolkata",
          stateName: "West Bengal",
          countryName: "India",
        },
        mobile: "9123456786",
        email: "pooja@fashiontrends.com",
        website: "www.fashiontrends.com",
        sourcebyTypeOfClient: clientTypes[8]._id,
        sourceFrom: sourcesFrom[2]._id,
        assignBy: users[2]._id,
        remark: "Instagram follower",
      },
      {
        companyName: "BuildCon Projects",
        clientName: "Anil Sharma",
        address: {
          line1: "258 Construction Lane",
          line2: "Builder's Hub",
          cityName: "Ahmedabad",
          stateName: "Gujarat",
          countryName: "India",
        },
        mobile: "9123456787",
        email: "anil@buildcon.com",
        website: "www.buildconprojects.com",
        sourcebyTypeOfClient: clientTypes[17]._id,
        sourceFrom: sourcesFrom[9]._id,
        assignBy: users[1]._id,
        remark: "Cold call converted",
      },
      {
        companyName: "FoodMart Chain",
        clientName: "Ritu Agarwal",
        address: {
          line1: "369 Food Street",
          line2: "Commercial Zone",
          cityName: "Jaipur",
          stateName: "Rajasthan",
          countryName: "India",
        },
        mobile: "9123456788",
        email: "ritu@foodmart.com",
        website: "www.foodmartchain.com",
        sourcebyTypeOfClient: clientTypes[16]._id,
        sourceFrom: sourcesFrom[6]._id,
        assignBy: users[2]._id,
        remark: "Email campaign response",
      },
      {
        companyName: "AutoParts India",
        clientName: "Manoj Kumar",
        address: {
          line1: "741 Auto Street",
          line2: "Industrial Estate",
          cityName: "Lucknow",
          stateName: "Uttar Pradesh",
          countryName: "India",
        },
        mobile: "9123456789",
        email: "manoj@autoparts.com",
        website: "www.autopartsindia.com",
        sourcebyTypeOfClient: clientTypes[14]._id,
        sourceFrom: sourcesFrom[17]._id,
        assignBy: users[1]._id,
        remark: "Partner referral",
      },
      {
        companyName: "Media House Productions",
        clientName: "Kavita Desai",
        address: {
          line1: "852 Media Lane",
          line2: "Film City",
          cityName: "Mumbai",
          stateName: "Maharashtra",
          countryName: "India",
        },
        mobile: "9123456790",
        email: "kavita@mediahouse.com",
        website: "www.mediahouseproductions.com",
        sourcebyTypeOfClient: clientTypes[18]._id,
        sourceFrom: sourcesFrom[12]._id,
        assignBy: users[2]._id,
        remark: "YouTube ad response",
      },
      {
        companyName: "Pharma Solutions",
        clientName: "Dr. Rajiv Nair",
        address: {
          line1: "963 Pharma Park",
          line2: "Bio-Tech Zone",
          cityName: "Bangalore",
          stateName: "Karnataka",
          countryName: "India",
        },
        mobile: "9123456791",
        email: "rajiv@pharmasol.com",
        website: "www.pharmasolutions.com",
        sourcebyTypeOfClient: clientTypes[13]._id,
        sourceFrom: sourcesFrom[0]._id,
        assignBy: users[1]._id,
        remark: "Website inquiry",
      },
      {
        companyName: "Logistics Express",
        clientName: "Sandeep Yadav",
        address: {
          line1: "159 Transport Nagar",
          line2: "Warehouse District",
          cityName: "Delhi",
          stateName: "Delhi",
          countryName: "India",
        },
        mobile: "9123456792",
        email: "sandeep@logisticsexp.com",
        website: "www.logisticsexpress.com",
        sourcebyTypeOfClient: clientTypes[12]._id,
        sourceFrom: sourcesFrom[11]._id,
        assignBy: users[2]._id,
        remark: "WhatsApp inquiry",
      },
      {
        companyName: "Hotel Paradise",
        clientName: "Deepak Singh",
        address: {
          line1: "357 Beach Road",
          line2: "Tourist Area",
          cityName: "Goa",
          stateName: "Goa",
          countryName: "India",
        },
        mobile: "9123456793",
        email: "deepak@hotelparadise.com",
        website: "www.hotelparadise.com",
        sourcebyTypeOfClient: clientTypes[10]._id,
        sourceFrom: sourcesFrom[5]._id,
        assignBy: users[1]._id,
        remark: "Google Ads campaign",
      },
      {
        companyName: "IT Services Hub",
        clientName: "Priyanka Iyer",
        address: {
          line1: "468 Tech Park",
          line2: "IT Corridor",
          cityName: "Pune",
          stateName: "Maharashtra",
          countryName: "India",
        },
        mobile: "9123456794",
        email: "priyanka@itservices.com",
        website: "www.itserviceshub.com",
        sourcebyTypeOfClient: clientTypes[7]._id,
        sourceFrom: sourcesFrom[3]._id,
        assignBy: users[2]._id,
        remark: "LinkedIn lead",
      },
      {
        companyName: "Green NGO Foundation",
        clientName: "Arjun Khanna",
        address: {
          line1: "579 Social Street",
          line2: "NGO Complex",
          cityName: "Chandigarh",
          stateName: "Chandigarh",
          countryName: "India",
        },
        mobile: "9123456795",
        email: "arjun@greenngo.org",
        website: "www.greenngofoundation.org",
        sourcebyTypeOfClient: clientTypes[19]._id,
        sourceFrom: sourcesFrom[18]._id,
        assignBy: users[1]._id,
        remark: "Existing client referral",
      },
      {
        companyName: "Bank Solutions Ltd",
        clientName: "Sanjay Gupta",
        address: {
          line1: "680 Banking Street",
          line2: "Financial District",
          cityName: "Mumbai",
          stateName: "Maharashtra",
          countryName: "India",
        },
        mobile: "9123456796",
        email: "sanjay@banksolutions.com",
        website: "www.banksolutions.com",
        sourcebyTypeOfClient: clientTypes[11]._id,
        sourceFrom: sourcesFrom[7]._id,
        assignBy: users[2]._id,
        remark: "Trade show contact",
      },
      {
        companyName: "Real Estate Developers",
        clientName: "Nisha Patel",
        address: {
          line1: "791 Property Lane",
          line2: "Realty Hub",
          cityName: "Surat",
          stateName: "Gujarat",
          countryName: "India",
        },
        mobile: "9123456797",
        email: "nisha@realestate.com",
        website: "www.realestatedevelopers.com",
        sourcebyTypeOfClient: clientTypes[9]._id,
        sourceFrom: sourcesFrom[13]._id,
        assignBy: users[1]._id,
        remark: "Newspaper ad response",
      },
      {
        companyName: "Textile Mills Co",
        clientName: "Ramesh Jain",
        address: {
          line1: "802 Textile Road",
          line2: "Mill Area",
          cityName: "Coimbatore",
          stateName: "Tamil Nadu",
          countryName: "India",
        },
        mobile: "9123456798",
        email: "ramesh@textilemills.com",
        website: "www.textilemillsco.com",
        sourcebyTypeOfClient: clientTypes[15]._id,
        sourceFrom: sourcesFrom[19]._id,
        assignBy: users[2]._id,
        remark: "Direct mail response",
      },
      {
        companyName: "Government Supplies",
        clientName: "Vinod Kumar",
        address: {
          line1: "913 Government Road",
          line2: "Admin Block",
          cityName: "Bhopal",
          stateName: "Madhya Pradesh",
          countryName: "India",
        },
        mobile: "9123456799",
        email: "vinod@govsupplies.gov.in",
        website: "www.governmentsupplies.gov.in",
        sourcebyTypeOfClient: clientTypes[3]._id,
        sourceFrom: sourcesFrom[14]._id,
        assignBy: users[1]._id,
        remark: "Tender inquiry",
      },
    ]);
    console.log("✅ Created 20 Account Masters");

    // ==================== 20 LEADS ====================
    const leads = [];
    const statuses = [
      "New Lead",
      "Quotation Given",
      "Follow Up",
      "Order Confirmation",
      "PI",
      "Order Execution",
      "Final Payment",
      "Dispatch",
      "Completed",
      "Lost",
    ];

    for (let i = 0; i < 20; i++) {
      const randomStatus =
        statuses[Math.floor(Math.random() * statuses.length)];
      const lead = {
        leadDate: new Date(2024, 0, i + 1),
        clientType: i % 2 === 0 ? "New" : "Existing",
        deliveryDate: new Date(2024, 2, i + 15),
        shippingCharges: (Math.random() * 1000 + 500).toFixed(2),
        budget: {
          from: (10000 + i * 1000).toString(),
          to: (20000 + i * 2000).toString(),
        },
        accountMaster: accountMasters[i]._id,
        leadStatus: randomStatus,
        maxStatusReached: randomStatus,
        items: [
          {
            inquiryCategory: inquiryCategories[i % 20]._id,
            modelSuggestion: modelSuggestions[i % 20]._id,
            qty: (Math.floor(Math.random() * 50) + 10).toString(),
            rate: modelSuggestions[i % 20].rate,
            gst: modelSuggestions[i % 20].gst.toString(),
            total: (
              parseFloat(modelSuggestions[i % 20].rate) *
              (Math.floor(Math.random() * 50) + 10)
            ).toFixed(2),
            isDone: i % 3 === 0,
            customizationType: customizationTypes[i % 20]._id,
            personalization: {
              isPersonalized: i % 4 === 0,
              location: i % 4 === 0 ? "Front Side" : "",
              description: i % 4 === 0 ? "Company logo printing" : "",
              name: i % 4 === 0 ? accountMasters[i].companyName : "",
            },
          },
        ],
        remarks: [
          {
            date: new Date(2024, 0, i + 2),
            remark: "Initial discussion completed",
          },
          {
            date: new Date(2024, 0, i + 5),
            remark: "Sent quotation via email",
          },
        ],
        paymentHistory:
          i % 3 === 0
            ? [
                {
                  date: new Date(2024, 0, i + 10),
                  amount: "5000",
                  modeOfPayment: "NEFT",
                  remark: "Advance payment received",
                },
              ]
            : [],
        followUps: [
          {
            date: new Date(2024, 0, i + 7),
            description: "Follow up call scheduled",
            createdAt: new Date(2024, 0, i + 3),
          },
        ],
        totalAmount: (
          parseFloat(modelSuggestions[i % 20].rate) *
            (Math.floor(Math.random() * 50) + 10) +
          parseFloat((Math.random() * 1000 + 500).toFixed(2))
        ).toFixed(2),
        confirmationRemark: i % 5 === 0 ? "Order confirmed by client" : "",
      };
      leads.push(lead);
    }

    await Lead.insertMany(leads);
    console.log("✅ Created 20 Leads");

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log("   - 5 Roles");
    console.log("   - 5 Users (Password: 123456)");
    console.log("   - 20 Client Types");
    console.log("   - 20 Customization Types");
    console.log("   - 20 Inquiry Categories");
    console.log("   - 20 Source From");
    console.log("   - 20 Model Suggestions");
    console.log("   - 20 Account Masters");
    console.log("   - 20 Leads");
    console.log("\n👤 Test Users:");
    console.log("   1. rajesh.kumar@example.com (Admin)");
    console.log("   2. priya.sharma@example.com (Sales Manager)");
    console.log("   3. amit.patel@example.com (Sales Executive)");
    console.log("   4. sneha.gupta@example.com (Operations Team)");
    console.log("   5. vikram.singh@example.com (Viewer)");
    console.log("   Password for all: 123456\n");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

seedDatabase();
