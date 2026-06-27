const mongoose = require("mongoose");

// Global plugin to handle MongoDB duplicate key errors
mongoose.plugin((schema) => {
  const handleDuplicate = (error, res, next) => {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const val = error.keyValue[field];
      next(new Error(`Duplicate value found: '${val}' for field '${field}'`));
    } else {
      next(error);
    }
  };
  schema.post('save', handleDuplicate);
  schema.post('update', handleDuplicate);
  schema.post('findOneAndUpdate', handleDuplicate);
  schema.post('insertMany', handleDuplicate);
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected ✅`);
    try {
      await mongoose.connection.collection("leadstatuses").dropIndex("order_1");
    } catch (e) {}
    try {
      const { setupDefaultLeadStatuses } = require("../controller/leadStatus");
      await setupDefaultLeadStatuses();
    } catch(e) {
      console.error("Seeding lead statuses failed", e);
    }
    try {
      const { setupDefaultTaskStatuses } = require("../controller/taskStatus");
      await setupDefaultTaskStatuses();
    } catch (e) {
      console.error("Seeding task statuses failed", e);
    }
  } catch (error) {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
