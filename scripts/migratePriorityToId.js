/**
 * Migration Script: assignedTo staff ka name → leadPriority ObjectId
 *
 * Logic:
 * 1. Har lead ka assignedTo (Staff ObjectId) se staff ka fullName nikalo
 * 2. Wo fullName trim + lowercase karke leadpriorities mein name se match karo
 * 3. Match mile to us priority ki _id lead ki priority field mein save karo
 * 4. Match na mile to priority null set karo aur log karo
 *
 * Run:
 *   node scripts/migratePriorityToId.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const DB_URL = process.env.DB_URL || process.env.MONGO_URI || process.env.DATABASE_URL;

async function migrate() {
  if (!DB_URL) {
    console.error("DB_URL not found in .env");
    process.exit(1);
  }

  await mongoose.connect(DB_URL);
  console.log("Connected to MongoDB\n");

  const leadsCol      = mongoose.connection.collection("leads");
  const staffCol      = mongoose.connection.collection("staffs");
  const prioritiesCol = mongoose.connection.collection("leadpriorities");

  // Step 1: leadPriority name → _id map banao (trim + lowercase)
  const priorities = await prioritiesCol.find({}).toArray();
  if (priorities.length === 0) {
    console.log("No leadPriority documents found. Please add priorities first.");
    await mongoose.disconnect();
    return;
  }

  const priorityMap = {};
  priorities.forEach((p) => {
    priorityMap[p.name.trim().toLowerCase()] = p._id;
  });

  console.log("LeadPriority map:");
  Object.entries(priorityMap).forEach(([name, id]) =>
    console.log(`  "${name}" → ${id}`)
  );
  console.log();

  // Step 2: Sirf wo leads fetch karo jinmein assignedTo hai
  const leads = await leadsCol
    .find({ assignedTo: { $exists: true, $ne: null } })
    .toArray();

  console.log(`Total leads with assignedTo: ${leads.length}\n`);

  let matched    = 0;
  let notMatched = 0;
  let noStaff    = 0;

  for (const lead of leads) {
    // Step 3: Staff ka fullName nikalo
    const staff = await staffCol.findOne({ _id: lead.assignedTo });

    if (!staff || !staff.fullName) {
      console.log(`  Staff not found for lead "${lead.fullName || lead._id}" (assignedTo: ${lead.assignedTo}) → skipped`);
      noStaff++;
      continue;
    }

    const staffNameKey = staff.fullName.trim().toLowerCase();

    // Step 4: Usi name se leadPriority mein dhundo
    const priorityId = priorityMap[staffNameKey];

    if (priorityId) {
      await leadsCol.updateOne(
        { _id: lead._id },
        { $set: { priority: priorityId } }
      );
      console.log(`  ✓ Lead "${lead.fullName}" → staff "${staff.fullName}" → priority matched → ID saved`);
      matched++;
    } else {
      await leadsCol.updateOne(
        { _id: lead._id },
        { $set: { priority: null } }
      );
      console.log(`  ✗ Lead "${lead.fullName}" → staff "${staff.fullName}" → no priority match → set null`);
      notMatched++;
    }
  }

  console.log(`\n========== Migration Summary ==========`);
  console.log(`  Priority matched & saved : ${matched}`);
  console.log(`  No priority match (null) : ${notMatched}`);
  console.log(`  Staff not found (skipped): ${noStaff}`);
  console.log(`  Total leads processed    : ${leads.length}`);
  console.log(`=======================================\n`);

  await mongoose.disconnect();
  console.log("Disconnected.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
