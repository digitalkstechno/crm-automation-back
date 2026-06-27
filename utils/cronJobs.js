const cron = require("node-cron");
const { seedData } = require("./seed");

// Schedule tasks to be run on the server.
const initializeCronJobs = () => {
  console.log("Initializing cron jobs...");
  
  // Run everyday at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("Running scheduled demo data reset...");
    try {
      await seedData();
      console.log("Scheduled demo data reset completed successfully.");
    } catch (error) {
      console.error("Error running scheduled demo data reset:", error);
    }
  });
  
  console.log("Cron jobs initialized.");
};

module.exports = { initializeCronJobs };
