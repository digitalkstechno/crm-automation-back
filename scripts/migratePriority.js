/**
 * Migration Script: Fix priority field in Lead collection
 *
 * Kya karta hai:
 * - Jinke leads mein priority string (e.g. "high", "medium", "low") hai
 *   unhe null set karta hai (ab sirf ObjectId valid hai)
 * - Jinke leads mein priority already valid ObjectId hai → unchanged rehte hain
 *
 * Run karo:
 *   node scripts/migratePriority.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const DB_URL = process.env.DB_URL || process.env.MONGO_URI || process.env.DATABASE_URL;

async function migrate() {
  if (!DB_URL) {
    console.error("DB connection string not found in .env (DB_URL / MONGO_URI / DATABASE_URL)");
    process.exit(1);
  }

  await mongoose.connect(DB_URL);
  console.log("Connected to MongoDB");

  const Lead = mongoose.connection.collection("leads");

  // String priority wale leads find karo
  const leads = await Lead.find({ priority: { $exists: true, $ne: null, $type: "string" } }).toArray();
  console.log(`Found ${leads.length} leads with string priority`);

  if (leads.length === 0) {
    console.log("Nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  const ids = leads.map((l) => l._id);

  const result = await Lead.updateMany(
    { _id: { $in: ids } },
    { $set: { priority: null } }
  );

  console.log(`Migrated ${result.modifiedCount} leads: priority set to null`);

  await mongoose.disconnect();
  console.log("Done. Disconnected.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
